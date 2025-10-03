import { AuthManager } from '@/utils/auth';
import { PROXY_SERVER } from '@/utils/config/proxyConfig';
import { extractViewState } from '@/utils/extractors/gradeExtractor';
import { CMSCourseRow, parseCmsCourses } from '@/utils/parsers/cmsCoursesParser';
import { CMSCourseView, parseCmsCourseView } from '@/utils/parsers/cmsCourseViewParser';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

async function makeProxyRequest(url: string, method: string = 'GET', body?: any, options?: { allowNon200?: boolean, headers?: Record<string, string> }): Promise<any> {
  const sessionCookie = await AuthManager.getSessionCookie();
  const { username, password } = await AuthManager.getCredentials();

  const payload: any = { url, method, cookies: sessionCookie || '', body };
  if (options?.headers) payload.headers = options.headers;
  if (username && password) {
    payload.useNtlm = true;
    payload.username = username;
    payload.password = password;
  }

  const response = await fetch(`${PROXY_SERVER}/proxy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Proxy request failed: ${response.status}`);
  const data = await response.json();
  if (data.status === 401) {
    await AuthManager.clearSessionCookie();
    throw new Error('Session expired. Please login again.');
  }
  if (data.status !== 200) {
    if (options?.allowNon200 && (data.status === 302 || data.status === 303)) return data;
    throw new Error(`Request failed: ${data.status}`);
  }
  return data;
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


