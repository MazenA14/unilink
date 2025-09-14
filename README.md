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
- Notifications https://apps.guc.edu.eg/student_ext/Main/Notifications.aspx
- Search for Staff https://apps.guc.edu.eg/student_ext/UserProfile/UserProfileSearch.aspx
- View Attendance https://apps.guc.edu.eg/student_ext/Attendance/ClassAttendance_ViewStudentAttendance_001.aspx?v=NXM874921
- Staff Schedule https://apps.guc.edu.eg/student_ext/Scheduling/SearchAcademicScheduled_001.aspx
- Course Schedule https://apps.guc.edu.eg/student_ext/Scheduling/SearchAcademicScheduled_001.aspx
- General Group Schedule https://apps.guc.edu.eg/student_ext/Scheduling/GeneralGroupSchedule.aspx
- Empty Slots (Rooms) https://gucroomschedule.web.app/
- Add skeletons for everything that loads
- Mobile Notifications
- Update alert (Use a custom proxy server)
- Add slot timing shift for BI/Architecture/... in the settings page (Should change the slot timing in the schedule page)

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
- Notifications
- Today's Schedule
- Your Instructors this semester (List of view profiles separated by course)
- Exam Seats
- View Attendance
- Other features button

## Database Schema
### Table 1
- Username, GUC-ID, Date Joined App, Last Opened Date, Number of Times Opened App, GPA, Joined Season (58), Major (MET)

-------------------------- -------------------------- -------------------------- --------------------------

## Build APK
- eas build -p android --profile preview
- Use 'npx expo install --check' to review and upgrade your dependencies
- npm install -g eas-cli (If error Occurred)

## To-Do (Notes)
- Clear Course grades cache on pull to refresh and not be visibile while refreshing
- Add all days on the schedule screen
- Make the schedule open on the mobile's current day
+ Remove the effect that occurs on pressing on the tabs at the bottom
- See schedule Caching
+ Change animation for the hamburger menu to Fade in
- Use saved username and password to log in automatically
- Replace 'Available Courses' with 'Semester N'
- ReApply All cache timings
- Unify the formating of the personal schedule
- Add time under the slot number in the personal schedule
+ Maybe add slot type for each slot in the personal schedule