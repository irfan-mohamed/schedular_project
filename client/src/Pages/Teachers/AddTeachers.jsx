import React, { useState, useEffect } from "react";
import SideNavbar from "../../Components/SideNavbar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faIdCard, faEnvelope, faList } from "@fortawesome/free-solid-svg-icons";
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
    email: "",
    designation: "AP" // Default value
  });

  const [teachers, setTeachers] = useState([]);
  const [subjectList, setSubjectList] = useState([]);
  const [editingTeacher, setEditingTeacher] = useState(null);

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
      email: teacher.email,
      designation: teacher.designation || "AP" // Set designation when editing
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
    if (!formData.preferences.includes(subject.id)) {
      setFormData((prevData) => ({
        ...prevData,
        preferences: [...prevData.preferences, subject.id]
      }));
    }
  };
  const handleRemovePreference = (subjectId) => {
    setFormData((prevData) => ({
      ...prevData,
      preferences: prevData.preferences.filter((pref) => pref !== subjectId)
    }));
  };


  return (
    <>
      <ToastContainer />
      <div className="container-fluid">
        <div className="row">
          {/* Sidebar - fixed width */}
          <div className="col-md-3 col-lg-2 d-md-block bg-dark sidebar collapse" style={{ minHeight: '100vh' }}>
            <SideNavbar />
          </div>
          
          {/* Main content - takes remaining space */}
          <main className="col-md-9 ms-sm-auto col-lg-10 px-md-4">
            <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
              <h2 className="h2">Add Teacher</h2>
            </div>

            {/* Form Section */}
            <div className="row">
              <div className="col-12 col-xl-8 mx-auto">
                <div className="card shadow-sm p-4 mb-4">
                  <form onSubmit={handleSubmit}>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label htmlFor="teacherName" className="form-label">
                          <FontAwesomeIcon icon={faUser} className="me-2" />
                          <span className="fw-bold">Teacher Name:</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          id="teacherName"
                          name="teacherName"
                          value={formData.teacherName}
                          onChange={handleChange}
                        />
                      </div>
                      
                      <div className="col-md-6 mb-3">
                        <label htmlFor="designation" className="form-label">
                          <FontAwesomeIcon icon={faList} className="me-2" />
                          <span className="fw-bold">Designation:</span>
                        </label>
                        <select
                          className="form-select"
                          id="designation"
                          name="designation"
                          value={formData.designation}
                          onChange={handleChange}
                        >
                          <option value="AP">Assistant Professor (AP)</option>
                          <option value="Professor">Professor</option>
                        </select>
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label htmlFor="teacherID" className="form-label">
                          <FontAwesomeIcon icon={faIdCard} className="me-2" />
                          <span className="fw-bold">Teacher ID:</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          id="teacherID"
                          name="teacherID"
                          value={formData.teacherID}
                          onChange={handleChange}
                        />
                      </div>
                      
                      <div className="col-md-6 mb-3">
                        <label htmlFor="email" className="form-label">
                          <FontAwesomeIcon icon={faEnvelope} className="me-2" />
                          <span className="fw-bold">Email:</span>
                        </label>
                        <input
                          type="email"
                          className="form-control"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <label htmlFor="preferences" className="form-label">
                        <FontAwesomeIcon icon={faUser} className="me-2" />
                        <span className="fw-bold">Subject Preferences (Double-click to select):</span>
                      </label>
                      <div className="form-control" style={{ minHeight: '100px', overflowY: 'auto' }}>
                        {subjectList.map((sub, idx) => {
                          const subLabel = `${sub.subjectName} (${sub.subjectType}) - Sem ${sub.semester}`;
                          return (
                            <div
                              key={idx}
                              className="py-1 cursor-pointer"
                              onDoubleClick={() => handlePreferenceDoubleClick(sub)}
                            >
                              {subLabel}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {formData.preferences.length > 0 && (
                      <div className="mb-3">
                        <div className="d-flex flex-wrap gap-2">
                          {formData.preferences.map((prefId, index) => {
                            const subject = subjectList.find(sub => sub.id === prefId);
                            return (
                              <span key={index} className="badge bg-primary py-2">
                                {subject ? subject.subjectName : prefId}
                                <button
                                  type="button"
                                  className="btn-close btn-close-white ms-2"
                                  onClick={() => handleRemovePreference(prefId)}
                                  style={{ fontSize: "0.6rem" }}
                                />
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="d-flex justify-content-center mt-4">
                      <button type="submit" className="btn btn-primary px-4" style={{ backgroundColor: "#5c3bcc" }}>
                        {editingTeacher ? 'Update' : 'Add'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Teachers Table Section */}
            <div className="row mt-4">
              <div className="col-12">
                <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                  <h2 className="h2">Teachers</h2>
                </div>
                
                <div className="table-responsive">
                  <table className="table table-striped table-hover">
                    <thead className="table-light">
                      <tr>
                        <th scope="col">S.No</th>
                        <th scope="col">Teacher Name</th>
                        <th scope="col">Designation</th>
                        <th scope="col">Teacher ID</th>
                        <th scope="col">Preferences</th>
                        <th scope="col">Email</th>
                        <th scope="col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teachers.map((item, index) => (
                        <tr key={index}>
                          <td>{index + 1}</td>
                          <td>{item.teacherName}</td>
                          <td>{item.designation || 'AP'}</td>
                          <td>{item.teacherID}</td>
                          <td>
                            {Array.isArray(item.preferences)
                              ? item.preferences.map(prefId => {
                                  const subject = subjectList.find(sub => sub.id === prefId);
                                  return subject ? subject.subjectName : prefId;
                                }).join(', ')
                              : JSON.parse(item.preferences || '[]').map(prefId => {
                                  const subject = subjectList.find(sub => sub.id === prefId);
                                  return subject ? subject.subjectName : prefId;
                                }).join(', ')}
                          </td>
                          <td>{item.email}</td>
                          <td>
                            <div className="d-flex gap-2">
                              <button className="btn btn-sm btn-warning" onClick={() => handleUpdate(item)}>
                                Update
                              </button>
                              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

export default AddTeachers;