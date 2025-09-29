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
+ Update alert + update Changelog
+ Reset Password # See Outlook
+ GUC Notifications https://apps.guc.edu.eg/student_ext/Main/Notifications.aspx
+ Search for Staff https://apps.guc.edu.eg/student_ext/UserProfile/UserProfileSearch.aspx
+ View Attendance https://apps.guc.edu.eg/student_ext/Attendance/ClassAttendance_ViewStudentAttendance_001.aspx?v=NXM874921

- Staff Schedule https://apps.guc.edu.eg/student_ext/Scheduling/SearchAcademicScheduled_001.aspx
- Course Schedule https://apps.guc.edu.eg/student_ext/Scheduling/SearchAcademicScheduled_001.aspx
- General Group Schedule https://apps.guc.edu.eg/student_ext/Scheduling/GeneralGroupSchedule.aspx
- Mobile Notifications (Slot Reminder)

## To-Do List (Optional)
- Add skeletons for everything that loads
- Empty Slots (Rooms) https://gucroomschedule.web.app/
- Evaluate Course (Release update when the university releases it)
- Evaluate Staff (Release update when the university releases it)
- Quizzes
- Weight calculation
- Bachelor endpoint
- Reminder for Password Reset
- Calendar
- Game

## Dashboard should contain:
+ Notifications
+ Today's Schedule
+ Exam Seats
+ CMS button
+ Your Instructors this semester (List of view profiles separated by course)
+ View Attendance

- CMS


## Database Schema
### Table 1 (Users)
+ Username, GUC-ID, Date Joined App, Last Opened Date, GPA, Joined Season (58), Major (MET)

### Table 2 (Feedback)
+ Username, Notes, Season Joined (58), Date, Version


## Build APK
- eas build -p android --profile preview
- Use 'npx expo install --check' to review and upgrade your dependencies
- npm install -g eas-cli (To upgrade eas-cli version)


## To-Do (Notes)
- Clear Course previous grades cache on pull to refresh and not be visibile while refreshing
- Redesign All cache timings

- On 1:00 open app to fetch attendance
- Make notification cached and fetch on loading dashboard, on fetching don't remove the old notifications (Preload notifications on dashboard)
- Add tutorial and lecture notifications by a variable time reminder (15min, 20 min...) time set in settings under preferences (Make the reminder optional, no lecture reminder)
- See if guc notifications could be fetched while app is closed
- On loading don't show loading state, show cached data and after fetching is complete, replace notifications
- Solve notifcations error if possible
- Notifiactions preloader is implemented, remove the option that it refetches on opening the notifications

- Handle offline mode gracefully
- Investigate 409 error in transcript page
- Investigate multiple proxy calls (A lot & repetitive)

- Wraping up the app:
    - Make it more efficient (Parsing Server Side, Parallel Data Fetching)
    - Remove the unneeded dependencies (Smaller file size)
    - Remove any console logs/wars/errors
    - Replace Alert.alert with custom alert component
    - See how all aspects of the app works (Caching,...)




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
+ Move semester gpa to the top
+ Use saved username and password to log in automatically
+ Put course name in the schedule (Match it from grades or attendance)
+ Default screen isn't working
+ Update detection not working
+ When i click twice on a season in the previous grades screen it removes the courses and says 'No courses found for this season'
+ Make the current/previous grades screens not show percentage but the actual mark (9/10)
+ Previous grades page is broken
+ Adjust Colouring of transcript semester gpa (All grade colour ranges)
+ Make links in notifications be clickable
+ On selecting the default screen don't go there
+ Naming isn't working with new parser
+ Lecture Location isn't parsed correctly
+ Add to the login modal popup that the username/password might be incorrect or the password expired
+ Add reset password feature on the login screen and in the settings
+ Change sign in button (Make it smaller)
+ Change signing in... loading
+ Clear all cache on logout
+ On downloading the apk can't retrieve items
+ Add the grade beside the GPA in the grading system and handle the 'Grade' offset
+ Move the 'i' button in the transcipt page
+ Multiple slots module & the information needs to open 90% (Like the notification modal)
+ Settings page is shifted up
+ Check consistency of modals in the whole app
+ Preload the attendance on opening dashboard (Rehandle all preloading and there order)
+ Check first time production app open, opens on the login screen
+ In the Courses under Instructor make it show only course name
+ What's new screen didn't appear, does it have something to do with the first time open attribute (Opening Order)
+ Add the attendance level when I have one (Now there is commented static badge)
+ Handle FF,FA,FX
+ Handle attended case in attendance
+ See why what's new feature not working
+ On pressing check for update it shows to models if there is an update
+ Unify update modal ui
+ See how to make attendance fetching faster and add this might take a minute
+ Add unilink logo to Gmail
+ Apply smart fetching, fetch grades & attendance on loading dashboard (See if something else needs smart fetching)
+ Add slot indicator depending on time of day
+ Adjust attendance warning ui
+ Change schedule haburger icon to be a drop down beside personal schedule
+ Add how to install file in drive
+ Add example in quick access tab
+ Add rename option
+ Fix top overlay overlapping by shifting image preview down
+ Remove X icon in quick access modal
+ Grades page crashes
+ Add statistics section that only appears for my username
+ Add View calendar button on dashboard that prompts user to upload his semester calendar to view at any time (Also delete option), also add rename and share options (under three dots icon) and preview if possible
+ Either search staff or course schedule
+ Unify all schedule and list colouring
+ Remove the descriptions for the course and group schedules




## Run these next time
- npx expo install @expo/metro-runtime react-native-worklets
- npx expo install --check
- npx expo install --fix
- npx expo install eslint-config-expo@~10.0.0