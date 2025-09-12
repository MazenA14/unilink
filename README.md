# GUC Connect

## To-Do List
+ Login https://guc-connect-login.vercel.app/api/ntlm-login
+ Financial Balance https://apps.guc.edu.eg/student_ext/Financial/BalanceView_001.aspx
+ Check Grades https://apps.guc.edu.eg/student_ext/Grade/CheckGrade_01.aspx
+ Check Previous Grades https://apps.guc.edu.eg/student_ext/Grade/CheckGradePerviousSemester_01.aspx
+ Transcript https://apps.guc.edu.eg/student_ext/Grade/Transcript_001.aspx?v=SBH574928
+ Settings page (Profile, Financials, Dark mode, Contact)
- Notifications https://apps.guc.edu.eg/student_ext/Main/Notifications.aspx
- Search for Staff https://apps.guc.edu.eg/student_ext/UserProfile/UserProfileSearch.aspx
- View Attendance https://apps.guc.edu.eg/student_ext/Attendance/ClassAttendance_ViewStudentAttendance_001.aspx?v=NXM874921
- Exam Seats https://apps.guc.edu.eg/student_ext/Exam/ViewExamSeat_01.aspx
- Empty Slots (Rooms) https://gucroomschedule.web.app/
- Student Schedule https://apps.guc.edu.eg/student_ext/Scheduling/GroupSchedule.aspx?v=825d1466-7884-412e-a97b-e8b49fe77839
- Staff Schedule https://apps.guc.edu.eg/student_ext/Scheduling/SearchAcademicScheduled_001.aspx
- Course Schedule https://apps.guc.edu.eg/student_ext/Scheduling/SearchAcademicScheduled_001.aspx
- General Group Schedule https://apps.guc.edu.eg/student_ext/Scheduling/GeneralGroupSchedule.aspx

## To-Do List (Optional)
- Evaluate Course
- Evaluate Staff
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

## Database Schema
### Table 1
- Username, GUC-ID, Date Joined App, Last Opened Date, Number of Times Opened App, GPA, Joined Season (58)

-------------------------- -------------------------- -------------------------- --------------------------

## Build APK
- eas build -p android --profile preview

## To-Do (Notes)
- Clear Course grades cache on pull to refresh