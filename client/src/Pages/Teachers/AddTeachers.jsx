import React, { useState, useEffect } from "react";
import SideNavbar from "../../Components/SideNavbar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faIdCard, faEnvelope } from "@fortawesome/free-solid-svg-icons";
import axios from 'axios';
import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './AddTeacher.css'

function AddTeachers() {

  const [refereshToken, setRefereshToken] = useState(null);

  const [formData, setFormData] = useState({
    teacherName: "",
    teacherID: "",
    preferences: [],
    email: ""
  });

  const [teachers, setTeachers] = useState([]);
  const [subjectList, setSubjectList] = useState([]);
  const [editingTeacher, setEditingTeacher] = useState(null); // Track the teacher being edited

  useEffect(() => {
    fetchTeachers();
    fetchSubjects();
  }, [refereshToken]);

  const fetchSubjects = async () => {
    try {
      const department = localStorage.getItem('department');
      const response = await axios.get("http://localhost:5001/api/fetchsubjects", {
        headers: { department }
      });
      setSubjectList(response?.data?.data || []);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      toast.error("Failed to fetch subject list");
    }
  };

  const fetchTeachers = async () => {
    try {
      const department = localStorage.getItem('department');
      const response = await axios.get("http://localhost:5001/api/fetchteachers", {
        headers: {
          department
        }
      });
      setTeachers(response?.data.data);
    } catch (error) {
      toast.error("Error fetching teachers:", error);
    }
  };

  const handleDelete = (id) => {
    confirmAlert({
      title: 'Confirm Deletion',
      message: 'Are you sure you want to delete this teacher?',
      buttons: [
        {
          label: 'Yes',
          onClick: async () => {
            try {
              const response = await axios.delete(`http://localhost:5001/api/deleteTeacher/${id}`,
                {
                  headers: {
                    department: localStorage.getItem('department')
                  }
                });
              if (response.status === 200) {
                toast.success('Teacher deleted successfully');
                setRefereshToken(response);
              } else {
                console.error('Failed to delete teacher');
                setRefereshToken(response);
              }
            } catch (error) {
              console.error('Error:', error);
            }
          },
          className: 'confirm-button-yes'
        },
        {
          label: 'No',
          onClick: () => { },
          className: 'confirm-button-no'
        }
      ],
      overlayClassName: 'confirm-overlay'
    });
  };

  const handleUpdate = (teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      teacherName: teacher.teacherName,
      teacherID: teacher.teacherID,
      preferences: teacher.preferences,
      email: teacher.email
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const department = localStorage.getItem('department');
      let response;
      if (editingTeacher) {
        response = await axios.put(`http://localhost:5001/api/updateTeacher/${editingTeacher.id}`, formData, {
          headers: { department },
        });
        toast.success('Teacher updated successfully');
      } else {
        response = await axios.post('http://localhost:5001/api/teachers', formData, {
          headers: { department },
        });
        toast.success('Teacher added successfully', { autoClose: 5000 });
      }
      setRefereshToken(response);
      setEditingTeacher(null);
      setFormData({
        teacherName: "",
        teacherID: "",
        preferences: "",
        email: ""
      });
    } catch (error) {
      if (error.response) {
        if (error.response.status === 400 && error.response.data.error.includes("duplicate key error")) {
          toast.error('Teacher ID is already used');
        } else {
          toast.error('An error occurred while adding/updating the teacher', { position: 'top-center', autoClose: 5000 });
        }
      } else {
        toast.error('Network error. Please try again later.', { position: 'top-center', autoClose: 5000 });
      }
      console.error('Error:', error);
    }
  };
  const handlePreferenceDoubleClick = (subject) => {
    if (!formData.preferences.includes(subject)) {
      setFormData((prevData) => ({
        ...prevData,
        preferences: [...prevData.preferences, subject]
      }));
    }
  };
  const handleRemovePreference = (subject) => {
    setFormData((prevData) => ({
      ...prevData,
      preferences: prevData.preferences.filter((pref) => pref !== subject)
    }));
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
            <h2 className="text-center mt-5 mb-4">Add Teacher</h2>

            <div className="d-flex justify-content-center">
              <div className="col-sm-6 p-4" style={{ boxShadow: "0 5px 19px rgba(134, 108, 212, 0.4)" }}>
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="teacherName" className="form-label">
                      <FontAwesomeIcon icon={faUser} className="me-2" />
                      <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>Teacher Name:</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="teacherName"
                      name="teacherName"
                      value={formData.teacherName}
                      onChange={handleChange}
                      style={{ fontWeight: "bold", borderColor: "#77757c" }}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="teacherID" className="form-label">
                      <FontAwesomeIcon icon={faIdCard} className="me-2" />
                      <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>Teacher ID:</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="teacherID"
                      name="teacherID"
                      value={formData.teacherID}
                      onChange={handleChange}
                      style={{ fontWeight: "bold", borderColor: "#77757c" }}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="preferences" className="form-label">
                      <FontAwesomeIcon icon={faUser} className="me-2" />
                      <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>Subject Preferences (Double-click to select):</span>
                    </label>
                    <div className="form-control" style={{ minHeight: '100px', overflowY: 'auto', borderColor: "#77757c" }}>
                      {subjectList.map((sub, idx) => {
                        const subLabel = `${sub.subjectName} (${sub.subjectType}) - Sem ${sub.semester}`;
                        return (
                          <div
                            key={idx}
                            style={{ cursor: "pointer", padding: "4px", fontWeight: "bold" }}
                            onDoubleClick={() => handlePreferenceDoubleClick(sub.subjectName)}
                          >
                            {subLabel}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tag display */}
                  {formData.preferences.length > 0 && (
                    <div className="mb-3">
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {formData.preferences.map((pref, index) => (
                          <span key={index} className="badge bg-primary" style={{ padding: "8px", fontSize: "0.9rem" }}>
                            {pref}
                            <button
                              type="button"
                              className="btn-close btn-close-white ms-2"
                              onClick={() => handleRemovePreference(pref)}
                              style={{ fontSize: "0.6rem" }}
                            />
                          </span>
                        ))}
                      </div>
                    </div>
                  )}


                  <div className="mb-3">
                    <label htmlFor="email" className="form-label">
                      <FontAwesomeIcon icon={faEnvelope} className="me-2" />
                      <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>Email:</span>
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      style={{ fontWeight: "bold", borderColor: "#77757c" }}
                    />
                  </div>

                  <div className="mb-3 d-flex justify-content-center">
                    <button type="submit" className="btn btn-primary" style={{ backgroundColor: "#5c3bcc" }}>
                      {editingTeacher ? 'Update' : 'Add'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div>
              <h2 className="text-center mt-5 mb-4">Teachers</h2>
              <table className="table table-striped table-bordered mt-4">
                <thead className="thead-light">
                  <tr>
                    <th className="tables" scope="col">Teacher Name</th>
                    <th className="tables" scope="col">Teacher ID</th>
                    <th className="tables" scope="col">Preferences</th>
                    <th className="tables" scope="col">Email</th>
                    <th className="tables" scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((item, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'table-light' : 'table-secondary'}>
                      <td className="table-data">{item.teacherName}</td>
                      <td className="table-data">{item.teacherID}</td>
                      <td className="table-data">
                        {Array.isArray(item.preferences)
                          ? item.preferences.join(', ')
                          : JSON.parse(item.preferences || '[]').join(', ')}
                      </td>
                      <td className="table-data">{item.email}</td>
                      <td className="table-data">
                        <button className="btn btn-warning" onClick={() => handleUpdate(item)}>Update</button>
                        <button className="btn btn-danger ms-2" onClick={() => handleDelete(item.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

export default AddTeachers;