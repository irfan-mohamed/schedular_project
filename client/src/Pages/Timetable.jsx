import React, { useEffect, useState } from "react";
import axios from "axios";
import 'bootstrap/dist/css/bootstrap.min.css';
import { useNavigate } from 'react-router-dom';
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

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

const SavedTimetablePage = () => {
  const [timetableData, setTimetableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const department = localStorage.getItem("department");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSavedTimetable = async () => {
      try {
        const response = await axios.get("http://localhost:5001/api/getSavedTimetable", {
          headers: { department },
        });
        setTimetableData(response.data.data);
      } catch (error) {
        console.error("Error fetching saved timetable:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSavedTimetable();
  }, [department]);

  const renderPeriodCell = (period) => {
    if (!period || !period.subject) return <span>-</span>;

    const isLab = period.subject.toLowerCase().includes("lab");
    const handleLecturerClick = () => {
      navigate(`/lecturer-timetable/${encodeURIComponent(period.teacher)}`);
    };

    // ✅ Move this INSIDE the component to access `department` and `timetableData`

    return (
      <div className="d-flex flex-column align-items-center">
        <strong className="text-uppercase text-center">
          {period.subject} {isLab ? <span className="text-muted">(Lab)</span> : null}
        </strong>
        <small
          className="text-primary text-center"
          style={{ cursor: "pointer", textDecoration: "underline" }}
          onClick={handleLecturerClick}
        >
          {period.teacher}
        </small>
        <small className="text-muted text-center">{period.room}</small>
      </div>
    );
  };
  const handleDownloadPDF = () => {
    timetableData.forEach((semesterData) => {
      const doc = new jsPDF("landscape");
  
      doc.setFontSize(16);
      doc.text(`Department: ${department}`, 14, 15);
      doc.text(`Semester: ${semesterData.semester}`, 14, 25);
  
      const columns = ["Day / Period", ...periods.map((p) => `${p.label}\n${p.time}`)];
  
      const rows = semesterData.timetable.slice(0, 5).map((dayData, i) => {
        const row = [weekdays[i]];
        periods.forEach((p, j) => {
          if (p.isBreak) {
            row.push(`${p.label}`);
          } else {
            const period = dayData[j];
            if (period && period.subject) {
              const isLab = period.subject.toLowerCase().includes("lab");
              row.push(
                `${period.subject}${isLab ? " (Lab)" : ""}\n${period.teacher}\n${period.room}`
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
        startY: 35,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 3,
          halign: 'center',
          valign: 'middle',
        },
        headStyles: {
          fillColor: [22, 160, 133],
          textColor: 255,
          fontStyle: 'bold',
        },
        didDrawPage: (data) => {
          doc.setFontSize(10);
          doc.text(`Generated Timetable - Page ${doc.internal.getNumberOfPages()}`, 14, doc.internal.pageSize.height - 10);
        }
      });
  
      doc.save(`Timetable_${department}_Semester_${semesterData.semester}.pdf`);
    });
  };
  
  


  const handleDownloadExcel = () => {
    const wb = XLSX.utils.book_new();

    timetableData.forEach((semesterData) => {
      const rows = [
        ["Day / Period", ...periods.map((p) => p.label)],
      ];

      semesterData.timetable.slice(0, 5).forEach((dayData, i) => {
        const row = [weekdays[i]];
        periods.forEach((p, j) => {
          if (p.isBreak) {
            row.push(p.label);
          } else {
            const period = dayData[j];
            if (period) {
              row.push(`${period.subject} (${period.teacher})`);
            } else {
              row.push("-");
            }
          }
        });
        rows.push(row);
      });

      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, `Semester ${semesterData.semester}`);
    });

    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, `Timetable_${department}.xlsx`);
  };
  return (
    <div className="container mt-4">
      <h2 className="text-center mb-4">Saved Timetables - {department}</h2>
      <div className="text-center mb-3">
        <button onClick={handleDownloadPDF} className="btn btn-danger mx-2">
          Download as PDF
        </button>
        <button onClick={handleDownloadExcel} className="btn btn-success mx-2">
          Download as Excel
        </button>
      </div>
      <div id="timetable-section">
        {loading ? (
          <p className="text-center">Loading saved timetable...</p>
        ) : timetableData.length === 0 ? (
          <p className="text-center">No saved timetable found for this department.</p>
        ) : (
          timetableData.map((semesterData, index) => (
            <div
              key={index}
              className="mb-5 semester-section"
              data-semester={semesterData.semester}
            >

              <h4 className="text-center mb-3">Semester {semesterData.semester}</h4>
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
                  {semesterData.timetable.slice(0, 5).map((dayData, i) => (
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
          ))
        )}
      </div>
    </div>
  );
};

export default SavedTimetablePage;
