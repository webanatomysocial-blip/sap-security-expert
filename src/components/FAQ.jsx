import React, { useState } from "react";
import { HiPlus } from "react-icons/hi";
// next-disabled: import "../css/FAQ.css";
const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`faq-item ${isOpen ? "active" : ""}`}>
      <button className="faq-question" onClick={() => setIsOpen(!isOpen)}>
        <h4>{question}</h4>
        <HiPlus className="faq-icon" />
      </button>
      <div
        className="faq-answer rte-content"
        dangerouslySetInnerHTML={{ __html: answer }}
      />
    </div>
  );
};

const FAQ = ({ title, faqs }) => {
  return (
    <div className="faq-section">
      {title && <h2 style={{ marginBottom: "24px" }}>{title}</h2>}
      <div className="faq-container">
        {faqs.map((faq, index) => (
          <FAQItem key={index} question={faq.question} answer={faq.answer} />
        ))}
      </div>
    </div>
  );
};

export default FAQ;
