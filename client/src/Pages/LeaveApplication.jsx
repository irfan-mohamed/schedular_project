import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import Sidebar from '../Components/Sidebar';

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
const teacherId = localStorage.getItem("teacherID");

const LeaveApplication = () => {
  const navigate = useNavigate();
  const { lecturerName } = useParams();
  const [formData, setFormData] = useState({
    date: '',
    periods: [],
    reason: '',
    substitute: '',
  });
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timetable, setTimetable] = useState([]);
  const [selectedDay, setSelectedDay] = useState('');
  const [leaveRequests, setLeaveRequests] = useState([]);

  useEffect(() => {
    const department = localStorage.getItem("department");

    const fetchTeachers = async () => {
      try {
        const response = await axios.get('http://localhost:5001/api/leave/teachers', {
          headers: { department }
        });
        // Filter out the current faculty from substitute options
        const otherTeachers = response.data.filter(t => t.name !== lecturerName);
        setTeachers(otherTeachers);
      } catch (error) {
        console.error('Error fetching teachers:', error);
      }
    };
    const fetchLeaveRequests = async () => {
      try {
        const department = localStorage.getItem("department");
        const teacherId = localStorage.getItem("teacherID");
        const response = await axios.get('http://localhost:5001/api/leave/my-requests', {
          headers: { department, teacherid: teacherId }
        });
        setLeaveRequests(response.data);
      } catch (error) {
        console.error('Error fetching leave requests:', error);
      }
    };

    fetchLeaveRequests();

    fetchTeachers();
    setLoading(false);
  }, [lecturerName]);

  const handleDateChange = async (e) => {
    const date = e.target.value;
    setFormData({ ...formData, date, periods: [] });

    if (date) {
      try {
        const department = localStorage.getItem("department");
        const response = await axios.get(`http://localhost:5001/api/lecturerTimetable`, {
          headers: {
            department,
            teacher: lecturerName,
          },
        });

        setTimetable(response.data.timetable);

        // Get the day name
        const dayOfWeek = new Date(date).getDay();
        const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        setSelectedDay(weekdays[dayOfWeek]);
      } catch (error) {
        console.error('Error fetching timetable:', error);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const department = localStorage.getItem("department");
      console.log({
        ...formData,
        teacher: lecturerName,
        department,
      });

      await axios.post(
        'http://localhost:5001/api/leave/submit',
        {
          teacherId: teacherId,
          leaveDate: formData.date,
          period: formData.periods,
          reason: formData.reason,
          suggestedSubstituteId: formData.substitute || null,
        },
        {
          headers: {
            department: department, // send department in headers
          },
        }
      );

      alert('Leave application submitted successfully!');
      navigate(`/lecturer-timetable/${encodeURIComponent(lecturerName)}`);
    } catch (error) {
      console.error('Error submitting leave application:', error.response?.data || error.message);
      alert('Failed to submit leave application. Please try again.');
    }
  };

  const handlePeriodChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setFormData({ ...formData, periods: selectedOptions });
  };

  const handleFullDaySelect = () => {
    const allPeriods = periods
      .filter(p => !p.isBreak)
      .map(p => p.label);
    setFormData({ ...formData, periods: allPeriods });
  };

  if (loading) {
    return <div className="text-center mt-4">Loading...</div>;
  }

  return (
    <div className="d-flex">
      <Sidebar />
      <div className="container mt-4" style={{ marginLeft: '250px' }}>
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card">
              <div className="card-header">
                <h3 className="text-center">Leave Application Form</h3>
                <h5 className="text-center text-muted">{lecturerName}'s Leave Request</h5>
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label">Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.date}
                      onChange={handleDateChange}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                    {selectedDay && (
                      <small className="text-muted">Selected day: {selectedDay}</small>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Period Selection</label>
                    <div className="mb-2">
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={handleFullDaySelect}
                      >
                        Select Full Day
                      </button>
                    </div>
                    <select
                      multiple
                      className="form-control"
                      value={formData.periods}
                      onChange={handlePeriodChange}
                      size="5"
                      required
                    >
                      {periods.map((period) => {
                        if (period.isBreak) return null;
                        const dayIndex = new Date(formData.date).getDay() - 1;
                        const periodIndex = periods.findIndex(p => p.label === period.label);
                        const hasClass = timetable[dayIndex]?.[periodIndex]?.subject;

                        return (
                          <option
                            key={period.label}
                            value={period.label}
                            disabled={!hasClass}
                          >
                            {period.label} ({period.time})
                            {hasClass ? ` - ${timetable[dayIndex][periodIndex].subject}` : ' - No class'}
                          </option>
                        );
                      })}
                    </select>
                    <small className="text-muted">Hold Ctrl (Windows) or Command (Mac) to select multiple periods</small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Leave Reason</label>
                    <textarea
                      className="form-control"
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      rows="3"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Suggested Substitute</label>
                    <select
                      className="form-select"
                      value={formData.substitute}
                      onChange={(e) => setFormData({ ...formData, substitute: e.target.value })}
                    >
                      <option value="">Select a substitute teacher</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="text-center">
                    <button type="submit" className="btn btn-primary">
                      Submit Leave Application
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <hr />
          <h4 className="mt-4">My Leave Requests</h4>
          <table className="table table-bordered mt-3">
            <thead className="table-light">
              <tr>
                <th>Date</th>
                <th>Periods</th>
                <th>Reason</th>
                <th>Substitute</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {leaveRequests.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center">No leave requests found</td>
                </tr>
              ) : (
                leaveRequests.map((req) => (
                  <tr key={req.id}>
                    <td>{req.leaveDate}</td>
                    <td>{JSON.parse(req.period).join(', ')}</td>
                    <td>{req.reason}</td>
                    <td>{req.suggestedSubstituteId}</td>
                    <td>
                      <span className={`badge bg-${req.status === 'Approved' ? 'success' : req.status === 'Rejected' ? 'danger' : 'warning'}`}>
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

        </div>
      </div>
    </div>
  );
};

export default LeaveApplication;
