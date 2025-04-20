import React, { useState, useEffect } from "react";
import axios from "axios";
import 'bootstrap/dist/css/bootstrap.min.css';
import { useNavigate } from 'react-router-dom';

const periods = [
  { label: "P1", time: "09:00 - 09:50" },
  { label: "P2", time: "09:50 - 10:40" },
  { label: "BREAK", time: "10:40 - 10:50", isBreak: true },
  { label: "P3", time: "10:50 - 11:40" },
  { label: "P4", time: "11:40 - 12:30" },
  { label: "LUNCH", time: "12:30 - 01:20", isBreak: true },
  { label: "P5", time: "01:20 - 02:10" },
  { label: "P6", time: "02:10 - 03:00" },
  { label: "BREAK", time: "03:00 - 03:10", isBreak: true },
  { label: "P7", time: "03:10 - 04:00" },
  { label: "P8", time: "04:00 - 04:50" },
];

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const GenerateTimetable = () => {
  const [timetableData, setTimetableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [department, setDepartment] = useState("");

  const fetchTimetable = async () => {
    try {
      setLoading(true);
      const department = localStorage.getItem("department");
      const response = await axios.get('http://localhost:5001/api/generateTimetable', {
        headers: { department }
      });
      setTimetableData(response.data.data);
    } catch (error) {
      console.error("Error generating timetable:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedDepartment = localStorage.getItem("department") || "CSE";
    setDepartment(storedDepartment);
  }, []);

  const navigate = useNavigate();

  const renderPeriodCell = (period) => {
    if (!period || !period.subject) return <span>-</span>;
    const isLab = period.subject.toLowerCase().includes("lab");
    const handleLecturerClick = () => {
      navigate(`/lecturer-timetable/${encodeURIComponent(period.teacher)}`);
    };
    return (
      <div className="d-flex flex-column align-items-center">
        <strong className="text-uppercase text-center">
          {period.subject} {isLab ? <span className="text-muted">(Lab)</span> : null}
        </strong>
        <small
          className="text-primary text-center cursor-pointer"
          style={{ cursor: 'pointer', textDecoration: 'underline' }}
          onClick={handleLecturerClick}
        >
          {period.teacher}
        </small>
        <small className="text-muted text-center">{period.room}</small>
      </div>
    );
  };
  // ✅ Move this INSIDE the component to access `department`
  
  return (
    <div className="container mt-4">
      <h2 className="text-center mb-4">Generated Timetables - {department}</h2>
      <div className="text-center mb-4">
        <button onClick={fetchTimetable} className="btn btn-primary">
          {loading ? "Generating..." : "Generate Timetable"}
        </button>
      </div>
      
      <div id="timetable-section">
        {timetableData.map((semesterData, index) => (
          <div key={index} className="mb-5">
            <h4 className="text-center mb-3">Semester {semesterData.semester}</h4>
            <table className="table table-bordered text-center">
              <thead className="thead-dark">
                <tr>
                  <th className="align-middle">Day / Period</th>
                  {periods.map((p, idx) => (
                    <th key={idx} className="align-middle">
                      {p.label}
                      <br />
                      <small>{p.time}</small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {semesterData.timetable.slice(0, 5).map((dayData, i) => (
                  <tr key={i}>
                    <td className="font-weight-bold align-middle">{weekdays[i]}</td>
                    {periods.map((p, j) => {
                      if (p.isBreak) {
                        return (
                          <td key={j} className="table-warning align-middle font-italic">
                            {p.label}
                          </td>
                        );
                      } else {
                        const lectureIndex = j;
                        return (
                          <td key={j} className="align-middle">
                            {renderPeriodCell(dayData[lectureIndex])}
                          </td>
                        );
                      }
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

    </div>
  );
};

export default GenerateTimetable;
