import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import SideNavbar from '../../Components/SideNavbar';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import { confirmAlert } from 'react-confirm-alert';
import 'react-toastify/dist/ReactToastify.css';

function AssignElectives() {
    const [subjects, setSubjects] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedTeachers, setSelectedTeachers] = useState([]);
    const [assignments, setAssignments] = useState([]);

    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                const response = await axios.get('http://localhost:5001/api/fetchsubjects');
                console.log(response.data.data);
                setSubjects(response.data.data);
            } catch (error) {
                console.error('Error fetching subjects:', error);
            }
        };

        const fetchTeachers = async () => {
            try {
                const response = await axios.get('http://localhost:5001/api/fetchteachers');
                console.log(response.data.data);
                setTeachers(response.data.data);
            } catch (error) {
                console.error('Error fetching teachers:', error);
            }
        };

        fetchSubjects();
        fetchTeachers();
    }, []);

    useEffect(() => {
        const fetchAssignments = async () => {
            try {
                const response = await axios.get('http://localhost:5001/api/fetchelective');
                console.log(response.data.data);
                setAssignments(response.data.data);
            } catch (error) {
                console.error('Error fetching assignments:', error);
            }
        };

        fetchAssignments();
    }, []);

    const handleAssign = async () => {
        try {
            await axios.post('http://localhost:5001/api/electiveassignments', {
                subjectId: selectedSubject,
                teacherId: selectedTeachers,
            });
            console.log('Assignment successful');
            toast.success('Assignment successful');
            const response = await axios.get('http://localhost:5001/api/fetchelective');
            console.log(response.data.data);
            setAssignments(response.data.data);
        } catch (error) {
            console.error('Error assigning:', error);
            toast.error('Failed to assign subject');
        }
    };

    const handleDeleteAssignment = async (AssignmentId) => {
        confirmAlert({
            title: 'Confirm Deletion',
            message: 'Are you sure you want to delete this assignment?',
            buttons: [
                {
                    label: 'Yes',
                    onClick: async () => {
                        try {
                            await axios.delete(`http://localhost:5001/api/deleteAssignments/${AssignmentId}`);
                            toast.success('Assignment deleted successfully');
                            const updatedAssignments = assignments.filter(assignment => assignment._id !== AssignmentId);
                            setAssignments(updatedAssignments);
                        } catch (error) {
                            console.error('Error deleting assignment:', error);
                            toast.error('Failed to delete assignment');
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

    const assignedSubjectIds = assignments.map(assignment => assignment.subjectId[0]?._id);

    const availableSubjects = subjects.filter(subject => subject.subjectType === 'Elective' && !assignedSubjectIds.includes(subject._id));

    return (
        <>
            <ToastContainer />
            <div className="container-fluid">
                <div className="row">
                    <div className="col-auto col-sm-3.2 bg-dark d-flex flex-column justify-content-between min-vh-100">
                        <SideNavbar />
                    </div>
                    <div className="col">
                        <h1 className="text-center mt-5 mb-4 custom-heading">Assign Electives</h1>

                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <label htmlFor="subject" className="form-label custom-label">Choose Subject:</label>
                                <select id="subject" className="form-select custom-select" onChange={(e) => setSelectedSubject(e.target.value)}>
                                    <option value="">Select Subject</option>
                                    {availableSubjects.map(subject => (
                                        <option key={subject._id} value={subject._id}>
                                            {subject.subjectName} - {subject.department}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-md-6 mb-3">
                                <label htmlFor="teacher" className="form-label custom-label">Choose Teacher:</label>
                                <select id="teacher" className="form-select custom-select" multiple onChange={(e) => setSelectedTeachers(Array.from(e.target.selectedOptions, option => option.value))}>
                                    <option value="">Select Teacher(s)</option>
                                    {teachers.map(teacher => (
                                        <option key={teacher._id} value={teacher._id}>{teacher.teacherName}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-12">
                                <button className="btn btn-primary" onClick={handleAssign}>Assign</button>
                            </div>
                        </div>

                        <div className="row mt-4">
                            <div className="col">
                                <h2>Assigned Subjects</h2>
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Teacher Name</th>
                                            <th>Subject Name</th>
                                            <th>Department</th>
                                            <th>Semester</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {assignments.filter(item => item?.subjectId[0]?.subjectType === 'Elective')
                                            .map((item, index) => (
                                                <tr key={index} className={index % 2 === 0 ? 'table-light' : 'table-secondary'}>
                                                    <td>
                                                        {item?.teacherId.map((teacher, index) => (
                                                            <span key={index}>
                                                                {teacher.teacherName}
                                                                {index !== item.teacherId?.length - 1 && ', '}
                                                            </span>
                                                        ))}
                                                    </td>
                                                    <td>
                                                        {item.subjectId.map(subject => (
                                                            subject.subjectName
                                                        ))}
                                                    </td>
                                                    <td>
                                                        {item.subjectId.map(subject => (
                                                            subject.department
                                                        ))}
                                                    </td>
                                                    <td>
                                                        {item.subjectId.map(subject => (
                                                            subject.semester
                                                        ))}
                                                    </td>
                                                    <td>
                                                        <button className="btn btn-danger" onClick={() => handleDeleteAssignment(item._id)}>Delete</button>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default AssignElectives;
