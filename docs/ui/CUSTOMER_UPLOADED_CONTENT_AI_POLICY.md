---
document_id: customer_uploaded_content_ai
title: Use of Red Hat Internal AI Support Tools with Customer Uploaded Content
document_version: "1.0"
effective_date: "2026-11-05"
---

# Use of Red Hat Internal AI Support Tools with Customer Uploaded Content (e.g., sosreports, mustgather, log files)

## Summary

Red Hat associates who provide support to our customers may use approved AI support tools to analyze Customer Uploaded Content (e.g. sosreports, mustgather material, log files) in line with the requirements and guidance set out in this document. Please note that there may be other data policy requirements such as for NAPs, FedRAMP, Confirmed Stateside Support or confirmed Sovereign Support that have additional requirements not covered in this document.

Customer Uploaded Content is Client Confidential Information under our contracts and such content may contain large amounts of data, some of it sensitive data, so we have to ensure appropriate handling when working with copies of Customer Uploaded Content.

## Key Requirements

When working with copies of Customer Uploaded Content, you must:

- Never use to train or fine-tune an AI model;
- Never retain for ongoing augmentation of an AI model;
- Only use for the purpose of providing and improving support to the customer;
- Retain access controls that are the same as access to originals (e.g., do not expand access to the underlying Customer Uploaded Content);
- Store on a temporary basis in a secure location so that they can be deleted as soon as practicable after analysis.

## Other Key Concepts

Customers should be instructed and, where possible, given tools to sanitize their data prior to uploading into the Customer Support Portal.

Regardless of whether or not the customer has sanitized their data, Red Hat associates must treat each uploaded file as customer Confidential Information — which means you must use a reasonable level of care to protect the information and only disclose it to associates with a need to know such information.

Only use systems and tools to store and analyze Customer Uploaded Content that have been appropriately onboarded, assessed and approved (e.g., via buy@redhat if third party tooling and, as applicable, AIA, PIA, ESS and appropriate assessments etc.).

Note that Google Workspace (including gemini.google.com and NotebookLM) is **not** approved for storing Customer Uploaded Content. Here is more specific information on support associate use of Gemini for Google Workspace and an explanation on why we restrict moving Customer Uploaded Content into Google Workspace.

---

**IntelliAide:** Use this deployment only when it has been onboarded and approved for your environment per the process above. This policy complements the IntelliAide User Guide and AI Usage Notice.
