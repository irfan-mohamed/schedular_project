// Components/TagInput.jsx
import React, { useState } from 'react';
import './TagInput.css'; // Optional: for styling

const TagInput = ({ tagList, onChange, options }) => {
  const [input, setInput] = useState("");

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && input.trim() !== "") {
      e.preventDefault();
      if (!tagList.includes(input)) {
        onChange([...tagList, input]);
      }
      setInput("");
    }
  };

  const handleSelect = (e) => {
    const selected = e.target.value;
    if (selected && !tagList.includes(selected)) {
      onChange([...tagList, selected]);
    }
    setInput("");
  };

  const handleRemove = (index) => {
    const updated = tagList.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="tag-input-container">
      <select onChange={handleSelect} value={input} className="form-select">
        <option value="">Select Subject</option>
        {options?.map((item, idx) => (
          <option key={idx} value={item.subjectName}>
            {item.subjectName} ({item.subjectType}) - Sem {item.semester}
          </option>
        ))}
      </select>
      <div className="tag-list mt-2">
        {tagList.map((tag, index) => (
          <span className="tag" key={index}>
            {tag}
            <button type="button" onClick={() => handleRemove(index)} className="tag-remove-btn">×</button>
          </span>
        ))}
      </div>
    </div>
  );
};

export default TagInput;
