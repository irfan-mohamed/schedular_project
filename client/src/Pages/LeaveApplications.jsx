import React, { useEffect, useState } from "react";
import axios from "axios";
import SideNavbar from "../Components/SideNavbar";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import 'bootstrap/dist/css/bootstrap.min.css';

import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";

const LeaveApplications = () => {
  const [leaveApplications, setLeaveApplications] = useState([]);
  const [freeTeachers, setFreeTeachers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);

  useEffect(() => {
    fetchLeaveApplications();
  }, []);

  const fetchLeaveApplications = async () => {
    try {
      const department = localStorage.getItem("department");
      const response = await axios.get("http://localhost:5001/api/leave/view", {
        headers: { department },
      });
      setLeaveApplications(response.data);
    } catch (error) {
      toast.error("Failed to fetch leave applications.");
    }
  };

  const checkFreeTeachers = async (leave) => {
    try {
      const response = await axios.post("http://localhost:5001/api/leave/free-teachers", {
        date: leave.fromDate,
        periods: leave.periods,
        department: localStorage.getItem("department"),
      });

      const sorted = response.data.sort(
        (a, b) => a.totalPeriods - b.totalPeriods
      );
      setFreeTeachers(sorted);
      setSelectedLeave(leave);
      setShowModal(true);
    } catch (error) {
      toast.error("Failed to fetch free teachers.");
    }
  };

  const handleDecision = async (leaveId, action, selectedSubstitute = null) => {
  try {
    const leave = selectedLeave || leaveApplications.find((l) => l._id === leaveId);

    const payload = {
      id: leaveId,
      status: action === "approve" ? "Approved" : "Rejected",
      approvedBy: localStorage.getItem("hodID") || "HOD",
      suggestedSubstituteId: selectedSubstitute || null,
      leaveDate: leave.fromDate,
      periods: leave.periods,
      teacherId: leave.teacherID,
    };

    await axios.put("http://localhost:5001/api/leave/update-status", payload);

    toast.success(`Leave ${action}d successfully`);
    setShowModal(false);
    fetchLeaveApplications();
  } catch (error) {
    console.error(error);
    toast.error(`Failed to ${action} leave`);
  }
};


  return (
    <>
      <ToastContainer />
      <div className="container-fluid">
        <div className="row">
          <div className="col-auto col-sm-3.2 bg-dark d-flex flex-column justify-content-between min-vh-100">
            <SideNavbar />
          </div>
          <div className="col">
            <h2 className="text-center mt-4 mb-4">Leave Applications</h2>
            {leaveApplications.length === 0 ? (
              <div className="text-center mt-5">
                <p>No leave applications found.</p>
              </div>
            ) : (
              <div className="table-responsive px-4">
                <table className="table table-bordered table-hover shadow-sm">
                  <thead className="table-dark">
                    <tr>
                      <th>Teacher</th>
                      <th>Date</th>
                      <th>Periods</th>
                      <th>Reason</th>
                      <th>Suggested Substitute</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveApplications.map((leave, index) => (
                      <tr key={index}>
                        <td>{leave.teacherName} ({leave.teacherID})</td>
                        <td>{new Date(leave.fromDate).toLocaleDateString()}</td>
                        <td>{leave.periods?.join(", ") || "-"}</td>
                        <td>{leave.reason}</td>
                        <td>{leave.substitute || "Not specified"}</td>
                        <td>
                          <span
                            className={`badge ${
                              leave.status === "Pending"
                                ? "bg-warning"
                                : leave.status === "Approved"
                                ? "bg-success"
                                : "bg-danger"
                            }`}
                          >
                            {leave.status}
                          </span>
                        </td>
                        <td>
                          {leave.status === "Pending" && (
                            <>
                              <button
                                className="btn btn-info btn-sm me-2"
                                onClick={() => checkFreeTeachers(leave)}
                              >
                                Check for Free Teachers
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDecision(leave._id, "reject")}
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
              <Modal.Header closeButton>
                <Modal.Title>Available Teachers for Substitution</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                {freeTeachers.length === 0 ? (
                  <p>No available teachers found.</p>
                ) : (
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Teacher ID</th>
                        <th>Free Periods</th>
                        <th>Total Assigned Periods</th>
                        <th>Select</th>
                      </tr>
                    </thead>
                    <tbody>
                      {freeTeachers.map((teacher, index) => (
                        <tr key={index}>
                          <td>{teacher.teacherName}</td>
                          <td>{teacher.teacherID}</td>
                          <td>{teacher.freePeriods?.join(", ")}</td>
                          <td>{teacher.totalPeriods}</td>
                          <td>
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() =>
                                handleDecision(selectedLeave._id, "approve", teacher.teacherID)
                              }
                            >
                              Approve
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowModal(false)}>
                  Close
                </Button>
              </Modal.Footer>
            </Modal>
          </div>
        </div>
      </div>
    </>
  );
};

export default LeaveApplications;
