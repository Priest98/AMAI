"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FAQItem {
  q: string;
  a: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "What does Oyinca do?",
    a: "Oyinca acts as your background social media manager. You provide photos or videos, and Oyinca analyses the media, drafts tailored captions and high-converting hashtags, schedules optimal posting windows, and holds drafts in an approval queue for your review.",
  },
  {
    q: "Which social platforms are supported?",
    a: "TikTok is Oyinca's primary focus in production today. Oyinca prepares and pushes content to TikTok with full format compliance and scheduling intelligence.",
  },
  {
    q: "Can Oyinca publish automatically?",
    a: "On paid plans with Autopilot enabled, Oyinca can automate the publishing pipeline according to your settings. Free plans operate strictly in Assisted mode, where every post must be reviewed and approved by you.",
  },
  {
    q: "Do I approve posts before publishing?",
    a: "Yes. In Assisted mode (default on Free and optional on paid plans), every post sits in your Approval Queue. Nothing is published until you click Approve or make any adjustments you desire.",
  },
  {
    q: "How does Oyinca learn my brand?",
    a: "Through the Oyinca Brain. Each piece of content, approval edit, and performance metric informs Oyinca's memory. It registers your tone, stylistic boundaries, and audience response so every subsequent draft feels more authentic.",
  },
  {
    q: "Can I cancel my plan?",
    a: "Yes, at any time. You can manage or cancel your subscription directly from Settings under Billing with immediate effect for future billing cycles.",
  },
  {
    q: "Is my content secure?",
    a: "Yes. Your media, brand assets, and TikTok OAuth connection tokens are encrypted and handled strictly within isolated tenant workspaces. Your data is never mixed with other users or used to train third-party public models.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="oy-faq-section" aria-label="Frequently Asked Questions">
      <div className="text-center">
        <p className="oy-eyebrow justify-center">Clarity & Answers</p>
        <h2>Questions, answered.</h2>
      </div>

      <div className="oy-faq-list">
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div key={item.q} className="oy-faq-item">
              <button
                type="button"
                className="oy-faq-question w-full text-left"
                onClick={() => toggle(index)}
                aria-expanded={isOpen}
              >
                <span>{item.q}</span>
                <ChevronDown
                  className={`w-5 h-5 text-[var(--oy-blue-steel)] transition-transform duration-200 flex-shrink-0 ml-4 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isOpen && <p className="oy-faq-answer">{item.a}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
