import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import 'bootstrap/dist/css/bootstrap.min.css';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Sidebar from '../Components/Sidebar';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

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

const LecturerTimetable = () => {
  const { lecturerName } = useParams();
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dailyHours, setDailyHours] = useState([]);
  const [theoryLabStats, setTheoryLabStats] = useState({ theory: 0, lab: 0, free: 0 });
  const [avgClassesPerDay, setAvgClassesPerDay] = useState(0);

  useEffect(() => {
    const department = localStorage.getItem("department");

    const fetchLecturerTimetable = async () => {
      try {
        const res = await axios.get(`http://localhost:5001/api/lecturerTimetable`, {
          headers: {
            department,
            teacher: lecturerName,
          },
        });
        setTimetable(res.data.timetable);
        calculateStatistics(res.data.timetable);
      } catch (err) {
        console.error("Error fetching lecturer timetable", err);
      } finally {
        setLoading(false);
      }
    };

    const calculateStatistics = (timetable) => {
      const hoursPerDay = [0, 0, 0, 0, 0];
      let theory = 0;
      let lab = 0;

      timetable.forEach((day, dayIndex) => {
        day.forEach((period, periodIndex) => {
          // Skip break periods in calculation
          if (periods[periodIndex].isBreak) return;

          if (!period || !period.subject) return;

          const subject = period.subject || "";
          const teacher = period.teacher || "";

          const isFree = !subject || subject === "-" || subject.includes("No Teacher") || teacher === "Not Assigned";
          if (isFree) return;

          hoursPerDay[dayIndex]++;

          if (subject.toLowerCase().includes("lab")) {
            lab++;
          } else {
            theory++;
          }
        });
      });

      const totalPossiblePeriods = 5 * 8; // 5 days × 8 periods (excluding breaks)
      const totalOccupied = theory + lab;
      const free = totalPossiblePeriods - totalOccupied;

      setDailyHours(hoursPerDay);
      setTheoryLabStats({ theory, lab, free });
      setAvgClassesPerDay((totalOccupied / 5).toFixed(1));
    };

    fetchLecturerTimetable();
  }, [lecturerName]);

  const renderPeriodCell = (period) => {
    if (!period || !period.subject) return <span>-</span>;

    const isLab = period.subject.toLowerCase().includes("lab");

    return (
      <div className="d-flex flex-column align-items-center">
        <strong className="text-uppercase text-center">
          {period.subject} {isLab ? <span className="text-muted">(Lab)</span> : null}
        </strong>
        <small className="text-muted text-center">{period.room}</small>
      </div>
    );
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF("landscape");
    doc.setFontSize(16);
    doc.text(`Lecturer Timetable - ${lecturerName}`, 14, 15);

    const columns = ["Day / Period", ...periods.map((p) => `${p.label}\n${p.time}`)];
    const rows = timetable.slice(0, 5).map((dayData, i) => {
      const row = [weekdays[i]];
      periods.forEach((p, j) => {
        if (p.isBreak) {
          row.push(`${p.label}`);
        } else {
          const period = dayData[j];
          if (period && period.subject) {
            const isLab = period.subject.toLowerCase().includes("lab");
            row.push(
              `${period.subject}${isLab ? " (Lab)" : ""}\n${period.room}`
            );
          } else {
            row.push("-");
          }
        }
      });
      return row;
    });

    autoTable(doc, {
      head: [columns],
      body: rows,
      startY: 25,
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 3,
        halign: "center",
        valign: "middle",
      },
      headStyles: {
        fillColor: [0, 102, 204],
        textColor: 255,
      },
    });

    doc.save(`Lecturer_Timetable_${lecturerName}.pdf`);
  };

  // Prepare data for daily hours bar chart
  const dailyHoursData = {
    labels: weekdays,
    datasets: [
      {
        label: 'Teaching Hours',
        data: dailyHours,
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Prepare data for theory vs lab pie chart
  const theoryLabData = {
    labels: ['Theory', 'Lab', 'Free Hours'],
    datasets: [
      {
        data: [theoryLabStats.theory, theoryLabStats.lab, theoryLabStats.free],
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(75, 192, 192, 0.5)',
          'rgba(201, 203, 207, 0.5)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(201, 203, 207, 1)'
        ],
        borderWidth: 1,
      },
    ],
  };

  if (loading) return <div className="text-center mt-4">Loading timetable for {lecturerName}...</div>;

  return (
    <div className="d-flex">
      <Sidebar />
      <div className="container mt-4" style={{ marginLeft: '250px' }}>
        <h3 className="text-center mb-4">{lecturerName}'s Timetable</h3>
        
        {/* Timetable Section */}
        <div className="card">
          <div className="card-header">
            <h5>Detailed Timetable</h5>
          </div>
          <div className="card-body">
            <table className="table table-bordered text-center">
              <thead className="thead-dark">
                <tr>
                  <th>Day / Period</th>
                  {periods.map((p, idx) => (
                    <th key={idx}>
                      {p.label}
                      <br />
                      <small>{p.time}</small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timetable.slice(0, 5).map((dayData, i) => (
                  <tr key={i}>
                    <td className="font-weight-bold">{weekdays[i]}</td>
                    {periods.map((p, j) => {
                      if (p.isBreak) {
                        return (
                          <td key={j} className="table-warning font-italic align-middle">
                            {p.label}
                          </td>
                        );
                      } else {
                        return (
                          <td key={j} className="align-middle">
                            {renderPeriodCell(dayData[j])}
                          </td>
                        );
                      }
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-center my-3">
          <button className="btn btn-danger mx-2" onClick={handleDownloadPDF}>
            Download PDF
          </button>
        </div>

        {/* Dashboard Section */}
        <div className="row mb-4">
          <div className="col-md-12 mt-3">
            <div className="card">
              <div className="card-header">
                <h5>Statistics</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-4">
                    <div className="card text-center">
                      <div className="card-body">
                        <h5 className="card-title">Average Classes per Day</h5>
                        <p className="card-text display-4">{avgClassesPerDay}</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card text-center">
                      <div className="card-body">
                        <h5 className="card-title">Total Theory Hours</h5>
                        <p className="card-text display-4">{theoryLabStats.theory}</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card text-center">
                      <div className="card-body">
                        <h5 className="card-title">Total Lab Hours</h5>
                        <p className="card-text display-4">{theoryLabStats.lab}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h5>Daily Class Hours</h5>
              </div>
              <div className="card-body">
                <Bar
                  data={dailyHoursData}
                  options={{
                    responsive: true,
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Hours'
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h5>Theory vs Lab Hours</h5>
              </div>
              <div className="card-body">
                <Pie data={theoryLabData} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LecturerTimetable;