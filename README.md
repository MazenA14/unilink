# UniLink

## To-Do List
+ Login https://guc-connect-login.vercel.app/api/ntlm-login
+ Financial Balance https://apps.guc.edu.eg/student_ext/Financial/BalanceView_001.aspx
+ Check Grades https://apps.guc.edu.eg/student_ext/Grade/CheckGrade_01.aspx
+ Check Previous Grades https://apps.guc.edu.eg/student_ext/Grade/CheckGradePerviousSemester_01.aspx
+ Transcript https://apps.guc.edu.eg/student_ext/Grade/Transcript_001.aspx?v=SBH574928
+ Settings page (Profile, Financials, Dark mode, Contact)
+ Student Schedule https://apps.guc.edu.eg/student_ext/Scheduling/GroupSchedule.aspx?v=825d1466-7884-412e-a97b-e8b49fe77839
+ Exam Seats https://apps.guc.edu.eg/student_ext/Exam/ViewExamSeat_01.aspx
+ Add slot timing shift for BI/Architecture/... in the settings page (Should change the slot timing in the schedule page)
+ Notifications https://apps.guc.edu.eg/student_ext/Main/Notifications.aspx

- View Attendance https://apps.guc.edu.eg/student_ext/Attendance/ClassAttendance_ViewStudentAttendance_001.aspx?v=NXM874921
- Search for Staff https://apps.guc.edu.eg/student_ext/UserProfile/UserProfileSearch.aspx
- Staff Schedule https://apps.guc.edu.eg/student_ext/Scheduling/SearchAcademicScheduled_001.aspx
- Course Schedule https://apps.guc.edu.eg/student_ext/Scheduling/SearchAcademicScheduled_001.aspx
- General Group Schedule https://apps.guc.edu.eg/student_ext/Scheduling/GeneralGroupSchedule.aspx
- Add skeletons for everything that loads
- Mobile Notifications
- Update alert + update Changelog (Use a custom proxy server)
- Empty Slots (Rooms) https://gucroomschedule.web.app/

## To-Do List (Optional)
- Evaluate Course
- Evaluate Staff
- Bachelor endpoint
- Calendar
- Force Reset Password
- Reset Password # See Outlook
- Reminder for Password Reset
- Game

## Dashboard should contain:
+ Notifications
+ Today's Schedule
+ Exam Seats
+ CMS button

- Your Instructors this semester (List of view profiles separated by course)
- View Attendance

## Database Schema
### Table 1
- Username, GUC-ID, Date Joined App, Last Opened Date, Number of Times Opened App, GPA, Joined Season (58), Major (MET)

-------------------------- -------------------------- -------------------------- --------------------------

## Build APK
- eas build -p android --profile preview
- Use 'npx expo install --check' to review and upgrade your dependencies
- npm install -g eas-cli (If error Occurred)

## To-Do (Notes)
+ Remove the effect that occurs on pressing on the tabs at the bottom
+ Change animation for the hamburger menu to Fade in
+ Unify the formating of the personal schedule
+ Maybe add slot type for each slot in the personal schedule
+ Add time under the slot number in the personal schedule
+ Make the schedule open on the mobile's current day
+ Replace 'Available Courses' with 'Semester N'
+ See schedule Caching
+ Add all days on the schedule screen
+ Add default screen choice in settings (Preferences Section)
+ Remove Pay button or make it redirect to the guc website and check the already implemented redirection

- Clear Course grades cache on pull to refresh and not be visibile while refreshing
- Use saved username and password to log in automatically
- ReApply All cache timings
- Clear all cache on logout
- Move semester gpa to the top
- Apply smart caching, fetch grades & attendance on loading dashboard
- Put course name in the schedule (Match it from grades or attendance)