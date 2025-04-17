import React, { useEffect, useState } from "react";
import SideNavbar from "../../Components/SideNavbar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBook, faChalkboard, faFlask } from "@fortawesome/free-solid-svg-icons";
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import { confirmAlert } from 'react-confirm-alert'; // Import confirmation dialog
import 'react-confirm-alert/src/react-confirm-alert.css';
import 'react-toastify/dist/ReactToastify.css';
import './AddSubject.css'

function AddSubjects() {
  const [refereshToken, setRefereshToken] = useState(null);
  const [subjectData, setSubjectData] = useState([])
  const [subjectType, setSubjectType] = useState("");
  const [theoryFormData, setTheoryFormData] = useState({
    subjectType: "",
    subjectName: "",
    semester: "",
    lecturesPerWeek: "",
    department: ""
  });
  const [labFormData, setLabFormData] = useState({
    subjectType: "",
    subjectName: "",
    semester: "",
    labsPerWeek: "",
    department: ""
  });
  const [electiveFormData, setElectiveFormData] = useState({
    subjectType: "",
    subjectName: "",
    semester: "",
    lecturesPerWeek: "",
    department: ""
  });

  const handleTypeSelection = (type) => {
    setSubjectType(type);
  };

  const handleTheoryChange = (e) => {
    const { name, value } = e.target;
    setTheoryFormData((prevData) => ({
      ...prevData,
      [name]: value,
      subjectType: subjectType
    }));
  };

  const handleLabChange = (e) => {
    const { name, value } = e.target;
    setLabFormData((prevData) => ({
      ...prevData,
      [name]: value,
      subjectType: subjectType
    }));
  };

  const handleElectiveChange = (e) => {
    const { name, value } = e.target;
    setElectiveFormData((prevData) => ({
      ...prevData,
      [name]: value,
      subjectType: subjectType
    }));
  };


  useEffect(() => {
    const fetchData = async () => {
      try {
        const department = localStorage.getItem('department');
  
        setTheoryFormData((prev) => ({ ...prev, department }));
        setLabFormData((prev) => ({ ...prev, department }));
        setElectiveFormData((prev) => ({ ...prev, department }));
  
        const response = await axios.get('http://localhost:5001/api/fetchsubjects', {
          headers: {
            department
          }
        });
  
        setSubjectData(response?.data.data);
      } catch (error) {
        console.error('Error:', error);
      }
    };
  
    fetchData();
  }, [refereshToken]);
  
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = subjectType === "Theory"
        ? theoryFormData
        : (subjectType === "Lab" ? labFormData : electiveFormData);
  
      const department = formData.department;
  
      if (formData.id) {
        // ✅ UPDATE logic
        const response = await axios.put(
          `http://localhost:5001/api/updatesubject/${formData.id}`,
          formData,
          {
            headers: {
              department
            }
          }
        );
  
        if (response.status === 200) {
          toast.success('Subject updated successfully', { autoClose: 5000 });
          setRefereshToken(response);
        } else {
          console.error('Failed to update subject');
        }
      } else {
        // ✅ ADD logic (existing part)
        const response = await axios.post(
          'http://localhost:5001/api/addsubjects',
          formData,
          {
            headers: {
              department
            }
          }
        );
  
        if (response.status === 201) {
          toast.success('Subject added successfully', { autoClose: 5000 });
          setRefereshToken(response);
        } else {
          console.error('Failed to add subject');
        }
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };
  
  
  const handleUpdateClick = (item) => {
    if (item.subjectType === "Theory") {
      setTheoryFormData({
        subjectType: item.subjectType,
        subjectName: item.subjectName,
        semester: item.semester,
        lecturesPerWeek: item.periodsPerWeek,
        department: item.department,
        id: item.id
      });
    } else if (item.subjectType === "Lab") {
      setLabFormData({
        subjectType: item.subjectType,
        subjectName: item.subjectName,
        semester: item.semester,
        labsPerWeek: item.periodsPerWeek,
        department: item.department,
        id: item.id
      });
    } else {
      setElectiveFormData({
        subjectType: item.subjectType,
        subjectName: item.subjectName,
        semester: item.semester,
        lecturesPerWeek: item.periodsPerWeek,
        department: item.department,
        id: item.id
      });
    }
  
    // Optionally scroll to the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  
  const handleDelete = async (id) => {
    if (!id) {
      console.error('No ID passed to handleDelete');
      return;
    }
  
    try {
      confirmAlert({
        title: 'Confirm Deletion',
        message: 'Are you sure you want to delete this subject?',
        buttons: [
          {
            label: 'Yes',
            onClick: async () => {
              try {
                const response = await axios.delete(`http://localhost:5001/api/deletesubject/${id}`,
                  {headers: {
                    department: localStorage.getItem('department')
                  }
                }
                );
                if (response.status === 200) {
                  toast.success('Subject deleted successfully');
                  setRefereshToken(response);
                } else {
                  console.error('Failed to delete subject');
                  setRefereshToken(response);
                }
              } catch (error) {
                console.error('Deletion request failed:', error);
              }
            }
          },
          {
            label: 'No',
            onClick: () => {}
          }
        ]
      });
    } catch (error) {
      console.error('Error in handleDelete:', error);
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
            <h2 className="text-center mt-5 mb-2">Add Subjects</h2>

            <div className="d-flex justify-content-center">
              <div className="col-sm-6 p-4" style={{ boxShadow: "0 5px 19px rgba(134, 108, 212, 0.4)" }}>
                <div className="mb-3">
                  <label className="form-label" style={{ fontSize: "1.3rem", fontWeight: "bold" }}>Subject Type:</label>
                  <div className="d-flex">
                    <button
                      className={`btn btn-outline-secondary me-3 ${subjectType === "Theory" ? "active" : ""}`}
                      onClick={() => handleTypeSelection("Theory")}
                      style={{ backgroundColor: subjectType === "Theory" ? "#5c3bcc" : "", color: subjectType === "Theory" ? "white" : "" }}
                    >
                      Theory
                    </button>
                    <button
                      className={`btn btn-outline-secondary me-3 ${subjectType === "Lab" ? "active" : ""}`}
                      onClick={() => handleTypeSelection("Lab")}
                      style={{ backgroundColor: subjectType === "Lab" ? "#5c3bcc" : "", color: subjectType === "Lab" ? "white" : "" }}
                    >
                      Lab
                    </button>
                    <button
                      className={`btn btn-outline-secondary ${subjectType === "Elective" ? "active" : ""}`}
                      onClick={() => handleTypeSelection("Elective")}
                      style={{ backgroundColor: subjectType === "Elective" ? "#5c3bcc" : "", color: subjectType === "Elective" ? "white" : "" }}
                    >
                      Elective
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="subjectName" className="form-label">
                      <FontAwesomeIcon icon={faBook} className="me-2" />
                      <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>Subject Name:</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="subjectName"
                      name="subjectName"
                      value={subjectType === "Theory" ? theoryFormData.subjectName : (subjectType === "Lab" ? labFormData.subjectName : electiveFormData.subjectName)}
                      onChange={subjectType === "Theory" ? handleTheoryChange : (subjectType === "Lab" ? handleLabChange : handleElectiveChange)}
                      style={{ fontWeight: "bold", borderColor: "#77757c" }}
                    />
                  </div>

                  {subjectType === "Theory" && (
                    <>
                      <div className="mb-3">
                        <label htmlFor="semesterSelect" className="form-label">
                          <FontAwesomeIcon icon={faChalkboard} className="me-2" />
                          <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>Semester:</span>
                        </label>
                        <select
                          className="form-select"
                          id="semesterSelect"
                          name="semester"
                          value={theoryFormData.semester}
                          onChange={handleTheoryChange}
                          style={{ fontWeight: "bold", borderColor: "#77757c" }}
                        >
                          <option value="">Select Semester</option>
                          <option value="I">I</option>
                          <option value="II">II</option>
                          <option value="III">III</option>
                          <option value="IV">IV</option>
                          <option value="V">V</option>
                          <option value="VI">VI</option>
                          <option value="VII">VII</option>
                          <option value="VII">VII</option>
                          <option value="VIII">VIII</option>

                        </select>
                      </div>
                      <div className="mb-3">
                        <label htmlFor="lecturesPerWeek" className="form-label">
                          <FontAwesomeIcon icon={faChalkboard} className="me-2" />
                          <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>No. of Lecture Hours per Week:</span>
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          id="lecturesPerWeek"
                          name="lecturesPerWeek"
                          value={theoryFormData.lecturesPerWeek}
                          onChange={handleTheoryChange}
                          style={{ fontWeight: "bold", borderColor: "#77757c" }}
                        />
                      </div>
                    </>
                  )}

                  {subjectType === "Lab" && (
                    <>
                      <div className="mb-3">
                        <label htmlFor="semesterSelect" className="form-label">
                          <FontAwesomeIcon icon={faChalkboard} className="me-2" />
                          <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>Semester:</span>
                        </label>
                        <select
                          className="form-select"
                          id="semesterSelect"
                          name="semester"
                          value={labFormData.semester}
                          onChange={handleLabChange}
                          style={{ fontWeight: "bold", borderColor: "#77757c" }}
                        >
                          <option value="">Select Semester</option>
                          <option value="I">I</option>
                          <option value="II">II</option>
                          <option value="III">III</option>
                          <option value="IV">IV</option>
                          <option value="V">V</option>
                          <option value="VI">VI</option>
                          <option value="VII">VII</option>
                          <option value="VII">VII</option>
                          <option value="VIII">VIII</option>
                        </select>
                      </div>
                      <div className="mb-3">
                        <label htmlFor="labsPerWeek" className="form-label">
                          <FontAwesomeIcon icon={faFlask} className="me-2" />
                          <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>No. of Lab Hours per Week:</span>
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          id="labsPerWeek"
                          name="labsPerWeek"
                          value={labFormData.labsPerWeek}
                          onChange={handleLabChange}
                          style={{ fontWeight: "bold", borderColor: "#77757c" }}
                        />
                      </div>
                    </>
                  )}

                  {subjectType === "Elective" && (
                    <>
                      <div className="mb-3">
                        <label htmlFor="semesterSelect" className="form-label">
                          <FontAwesomeIcon icon={faChalkboard} className="me-2" />
                          <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>Semester:</span>
                        </label>
                        <select
                          className="form-select"
                          id="semesterSelect"
                          name="semester"
                          value={electiveFormData.semester}
                          onChange={handleElectiveChange}
                          style={{ fontWeight: "bold", borderColor: "#77757c" }}
                        >
                          <option value="">Select Semester</option>
                          <option value="I">I</option>
                          <option value="II">II</option>
                          <option value="III">III</option>
                          <option value="IV">IV</option>
                          <option value="V">V</option>
                          <option value="VI">VI</option>
                          <option value="VII">VII</option>
                          <option value="VII">VII</option>
                          <option value="VIII">VIII</option>
                        </select>
                      </div>
                      <div className="mb-3">
                        <label htmlFor="lecturesPerWeek" className="form-label">
                          <FontAwesomeIcon icon={faChalkboard} className="me-2" />
                          <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>No. of Lecture Hour per Week:</span>
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          id="lecturesPerWeek"
                          name="lecturesPerWeek"
                          value={electiveFormData.lecturesPerWeek}
                          onChange={handleElectiveChange}
                          style={{ fontWeight: "bold", borderColor: "#77757c" }}
                        />
                      </div>
                    </>
                  )}

                  <div className="mb-3">
                    <label htmlFor="departmentSelect" className="form-label">
                      <FontAwesomeIcon icon={faFlask} className="me-2" />
                      <span style={{ fontSize: "1.3rem", fontWeight: "bold" }}>Department:</span>
                    </label>
                    <select
                      className="form-select"
                      id="departmentSelect"
                      name="department"
                      value={subjectType === "Theory" ? theoryFormData.department : (subjectType === "Lab" ? labFormData.department : electiveFormData.department)}
                      disabled
                      style={{ fontWeight: "bold", borderColor: "#77757c", backgroundColor: "#e9ecef" }}
                    >
                      <option value={theoryFormData.department}>
                        {theoryFormData.department || "Loading..."}
                      </option>
                    </select>
                  </div>
                  <div className="mb-3 d-flex justify-content-center">
                    <button type="submit" className="btn btn-primary" style={{ backgroundColor: "#5c3bcc", color: "white" }}>
                      ADD
                    </button>
                  </div>
                </form>
              </div>
            </div>
            <table className="table table-striped table-bordered mt-4">
              <thead className="thead-light">
                <tr>
                  <th className="topic">Subject Name</th>
                  <th className="topic">Subject Type</th>
                  <th className="topic">Semester</th>
                  <th className="topic">Lecture/Lab Hours per Week</th>
                  <th className="topic">Department</th>
                  <th className="topic">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subjectData.map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'table-light' : 'table-secondary'}>
                    <td className="table-data">{item.subjectName}</td>
                    <td className="table-data">{item.subjectType}</td>
                    <td className="table-data">{item.semester}</td>
                    <td className="table-data">{item.periodsPerWeek}</td>
                    <td className="table-data">{item.department}</td>
                    <td className="table-data">
                      <button className="btn btn-warning mr-2" onClick={() => handleUpdateClick(item)}>Update</button>
                      <button className="btn btn-danger" onClick={() => handleDelete(item.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

export default AddSubjects;