import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const { lecturerName } = useParams();

  return (
    <div className="sidebar" style={{
      width: '250px',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      backgroundColor: '#f8f9fa',
      padding: '20px',
      boxShadow: '2px 0 5px rgba(0,0,0,0.1)'
    }}>
      <h4 className="mb-4">Menu</h4>
      <div className="d-flex flex-column">
        <button 
          onClick={() => navigate(`/leave-application/${encodeURIComponent(lecturerName)}`)}
          style={{
            padding: '10px',
            marginBottom: '10px',
            borderRadius: '5px',
            cursor: 'pointer',
            backgroundColor: '#e9ecef',
            border: 'none',
            textAlign: 'left',
            width: '100%'
          }}
        >
          Leave Application
        </button>
        <button 
          onClick={() => navigate('/notifications')}
          style={{
            padding: '10px',
            marginBottom: '10px',
            borderRadius: '5px',
            cursor: 'pointer',
            backgroundColor: '#e9ecef',
            border: 'none',
            textAlign: 'left',
            width: '100%'
          }}
        >
          Notifications
        </button>
      </div>
    </div>
  );
};

export default Sidebar; 