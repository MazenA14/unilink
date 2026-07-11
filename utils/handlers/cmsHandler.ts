import { makeGucRequest as makeProxyRequest } from '@/utils/gucRequest';
import { gucDownloadFile, gucOpenFile, gucSaveToDownloads } from '@/utils/gucNativeClient';
import { extractViewState } from '@/utils/extractors/gradeExtractor';
import { CMSCourseRow, parseCmsCourses } from '@/utils/parsers/cmsCoursesParser';
import { CMSCourseView, parseCmsCourseView } from '@/utils/parsers/cmsCourseViewParser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cacheDirectory, documentDirectory, deleteAsync, getInfoAsync, moveAsync } from 'expo-file-system/legacy';

const CMS_HOME_ENDPOINT = 'https://cms.guc.edu.eg/apps/student/ViewAllCourseStn';
const CMS_COURSES_CACHE_KEY = 'cms_courses_cache_v1';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const CMS_COURSE_VIEW_CACHE_PREFIX = 'cms_course_view_v1:';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface CmsCoursesCacheEntry {
  data: CMSCourseRow[];
  cachedAt: number;
  expiry: number;
}

interface CmsCourseViewCacheEntry {
  data: CMSCourseView;
  cachedAt: number;
  expiry: number;
}

export async function getCmsCourses(bypassCache: boolean = false): Promise<CMSCourseRow[]> {
  if (!bypassCache) {
    try {
      const cached = await AsyncStorage.getItem(CMS_COURSES_CACHE_KEY);
      if (cached) {
        const parsed: CmsCoursesCacheEntry = JSON.parse(cached);
        if (Date.now() < parsed.expiry) {
          return parsed.data;
        }
      }
    } catch {}
  }

  const initial = await makeProxyRequest(CMS_HOME_ENDPOINT, 'GET');
  const html: string = initial.html || initial.body || '';
  const rows = parseCmsCourses(html);

  try {
    const entry: CmsCoursesCacheEntry = { data: rows, cachedAt: Date.now(), expiry: Date.now() + THIRTY_DAYS_MS };
    await AsyncStorage.setItem(CMS_COURSES_CACHE_KEY, JSON.stringify(entry));
  } catch {}

  return rows;
}

export async function submitCmsViewCourse(buttonName: string): Promise<string> {
  // Always fetch fresh page to get valid viewstate
  const initial = await makeProxyRequest(CMS_HOME_ENDPOINT, 'GET');
  const initialHtml: string = initial.html || initial.body || '';
  const vs = extractViewState(initialHtml);
  if (!vs.__VIEWSTATE || !vs.__VIEWSTATEGENERATOR || !vs.__EVENTVALIDATION) {
    throw new Error('Failed to extract view state');
  }

  const form = new URLSearchParams();
  form.append('__EVENTTARGET', buttonName);
  form.append('__EVENTARGUMENT', '');
  form.append('__VIEWSTATE', vs.__VIEWSTATE);
  form.append('__VIEWSTATEGENERATOR', vs.__VIEWSTATEGENERATOR);
  form.append('__EVENTVALIDATION', vs.__EVENTVALIDATION);

  const post = await makeProxyRequest(CMS_HOME_ENDPOINT, 'POST', form.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    allowNon200: true,
  });

  // Some pages may redirect; return body/html for caller to decide
  return post.html || post.body || '';
}

export async function getCmsCourseView(courseId: string, seasonId: string, bypassCache: boolean = false): Promise<CMSCourseView> {
  // Try cache first (unless bypassing for refresh)
  const cacheKey = `${CMS_COURSE_VIEW_CACHE_PREFIX}${courseId}:${seasonId}`;
  if (!bypassCache) {
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const parsed: CmsCourseViewCacheEntry = JSON.parse(cached);
        if (Date.now() < parsed.expiry) {
          return parsed.data;
        }
      }
    } catch {}
  }

  // Fetch fresh
  const url = `https://cms.guc.edu.eg/apps/student/CourseViewStn.aspx?id=${encodeURIComponent(courseId)}&sid=${encodeURIComponent(seasonId)}`;
  const res = await makeProxyRequest(url, 'GET');
  const html: string = res.html || res.body || '';
  const data = parseCmsCourseView(html);

  // Cache for one day
  try {
    const entry: CmsCourseViewCacheEntry = { data, cachedAt: Date.now(), expiry: Date.now() + ONE_DAY_MS };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch {}

  return data;
}

// ---------------------------------------------------------------------------
// CMS content download / preview (NTLM-authenticated, binary-safe)
// ---------------------------------------------------------------------------

const CMS_ORIGIN = 'https://cms.guc.edu.eg';

export interface CmsFile {
  /** `file://` URI of the downloaded file on disk. */
  uri: string;
  /** Display / save filename. */
  fileName: string;
  /** MIME type used to open the file. */
  mimeType: string;
}

/** Turn a possibly-relative CMS href into an absolute URL. */
function toAbsoluteCmsUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${CMS_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

const EXT_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  zip: 'application/zip',
  rar: 'application/vnd.rar',
  txt: 'text/plain',
  csv: 'text/csv',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  mp4: 'video/mp4',
  mp3: 'audio/mpeg',
};

function extensionOf(name: string): string {
  const m = name.match(/\.([a-z0-9]{1,5})(?:\?|#|$)/i);
  return m ? m[1].toLowerCase() : '';
}

function mimeFor(fileName: string, serverContentType?: string): string {
  const ext = extensionOf(fileName);
  if (ext && EXT_MIME[ext]) return EXT_MIME[ext];
  if (serverContentType) return serverContentType.split(';')[0].trim();
  return 'application/octet-stream';
}

/** Strip characters that are illegal in filenames. */
function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim();
}

/**
 * Download a CMS content item using the authenticated native NTLM session.
 *
 * @param url        The content href (absolute or CMS-relative).
 * @param options.toCache  When true, saves into the cache dir (for a transient
 *                         preview); otherwise saves into the documents dir.
 * @param options.fallbackName  Name to use if the server doesn't provide one.
 */
export async function downloadCmsContent(
  url: string,
  options?: { toCache?: boolean; fallbackName?: string }
): Promise<CmsFile> {
  const fullUrl = toAbsoluteCmsUrl(url);
  const dir = options?.toCache ? cacheDirectory : documentDirectory;
  if (!dir) throw new Error('No writable directory available');

  // Download to a provisional path first; the real name comes from the response.
  const tmpPath = `${dir}cms_dl_${Date.now()}`;
  const res = await gucDownloadFile(fullUrl, tmpPath);

  if (res.status === 401) {
    throw new Error('Session expired. Please login again.');
  }
  if (res.status < 200 || res.status >= 300 || !res.filePath) {
    throw new Error(`Download failed (${res.status})`);
  }

  // Resolve a clean, extension-bearing filename.
  let fileName = sanitizeFileName(res.fileName || options?.fallbackName || 'download');
  if (!extensionOf(fileName)) {
    const urlExt = extensionOf(fullUrl);
    if (urlExt) fileName = `${fileName}.${urlExt}`;
  }

  const finalPath = `${dir}${fileName}`;
  try {
    if (finalPath !== res.filePath) {
      const info = await getInfoAsync(finalPath);
      if (info.exists) await deleteAsync(finalPath, { idempotent: true });
      await moveAsync({ from: res.filePath, to: finalPath });
    }
  } catch {
    // If the move fails for any reason, fall back to the provisional path.
    return { uri: res.filePath, fileName, mimeType: mimeFor(fileName, res.contentType) };
  }

  return { uri: finalPath, fileName, mimeType: mimeFor(fileName, res.contentType) };
}

/**
 * Download a CMS content item to the cache and open it in the device's default
 * viewer (in-app preview, no external browser round-trip).
 */
export async function previewCmsContent(url: string, fallbackName?: string): Promise<void> {
  const file = await downloadCmsContent(url, { toCache: true, fallbackName });
  await gucOpenFile(file.uri, file.mimeType);
}

/**
 * Download a CMS content item and save it straight into the device's public
 * Downloads folder (no share sheet). Returns the saved file info.
 */
export async function saveCmsContent(
  url: string,
  fallbackName?: string,
  openAfter: boolean = true
): Promise<CmsFile> {
  // Download to the cache first, then hand off to MediaStore / Downloads.
  const file = await downloadCmsContent(url, { toCache: true, fallbackName });
  const saved = await gucSaveToDownloads(file.uri, file.fileName, file.mimeType);
  // Open the file for the user. We open the cache copy (served via FileProvider)
  // since that works uniformly across Android versions; leaving it in the cache
  // is fine as the OS reclaims it later. If no viewer app exists, the save still
  // succeeded, so swallow the open error.
  if (openAfter) {
    try { await gucOpenFile(file.uri, file.mimeType); } catch {}
  }
  return { uri: saved.uri, fileName: saved.fileName, mimeType: file.mimeType };
}


