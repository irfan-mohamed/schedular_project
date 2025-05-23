import './App.css';
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';


import SignInPage from './Components/SignInPage';
import Navbar from './Components/Navbar';

import AddSubjects from './Pages/Subjects/AddSubjects';
import AddTeacher from './Pages/Teachers/AddTeachers';
import AddRooms from './Pages/Rooms/AddRooms';
import GenerateTimetable from './Pages/Generate/GenerateTimetable'
import LeaveApplication from './Pages/LeaveApplication';
import LeaveApplications from './Pages/LeaveApplications';

import Home from './Pages/Home'
import './styling/HomePage.css'
import About from './Pages/About';
import Features from './Pages/Features';
import LecturerTimetable from "./Pages/LecturerTimetable";
import SavedTimetablePage from "./Pages/Timetable";

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signIn" element={<SignInPage />} />
        <Route path="/about" element={<Features />} />
        <Route path="/help" element={<About/>} />

        <Route path="/add-subject" element={<AddSubjects />} />
        <Route path="/add-teachers" element={<AddTeacher />} />
        <Route path="/add-classrooms" element={<AddRooms />} />
        <Route path="/leave-applications" element={<LeaveApplications />} />

        <Route path="/generate" element={<AddSubjects/>}></Route>
        <Route path="/generate-timetable" element={<GenerateTimetable />}></Route>
        <Route path="/lecturer-timetable/:lecturerName" element={<LecturerTimetable />} />
        <Route path="/lecturer-timetable/:teacherID" element={<LecturerTimetable />} />
        <Route path="/timetables" element={<SavedTimetablePage />} />
        <Route path="/leave-application/:lecturerName" element={<LeaveApplication />} />
        <Route path="/notifications" element={<div>Notifications Page (Coming Soon)</div>} />

      </Routes>
    </Router>
  );
}

export default App;



