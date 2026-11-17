# Frontend acceptance cases

These are manual acceptance scenarios, not evidence that the checks have passed.

001. **Bogota D.C. / selection:** Selecting this municipality updates the jurisdiction field without changing the project description.
002. **Bogota D.C. / coverage:** The coverage status reflects the API result, including source count and section count when available.
003. **Bogota D.C. / missing-coverage:** When coverage is absent, the interface explains the limitation without claiming that a legal rule was found.
004. **Bogota D.C. / discovery:** Source discovery displays official HTTPS candidates for the selected municipality.
005. **Bogota D.C. / source-review:** A discovered source is labeled pending review until an administrator confirms and imports it.
006. **Bogota D.C. / worker:** The document worker normalizes a multiline project description without freezing text input.
007. **Bogota D.C. / validation:** A short or empty project description shows a Spanish validation message and disables submission.
008. **Bogota D.C. / mismatch:** A description naming another municipality prompts correction before a checklist request is sent.
009. **Bogota D.C. / progress:** A checklist request shows streamed progress and elapsed time while the backend is working.
010. **Bogota D.C. / calculation:** Proposed area ratios are displayed separately from unverified legal maximums.
011. **Bogota D.C. / citations:** Every cited source offers an external link and expandable excerpt without clipping substantive text.
012. **Bogota D.C. / account:** A citizen can register or sign in and sees only the account role assigned by the server.
013. **Bogota D.C. / history:** A signed-in citizen can revisit and delete only personal saved queries.
014. **Bogota D.C. / responsive-theme:** The light default, dark toggle, keyboard focus, and single-column mobile layout remain usable.
015. **Pasto / selection:** Selecting this municipality updates the jurisdiction field without changing the project description.
016. **Pasto / coverage:** The coverage status reflects the API result, including source count and section count when available.
017. **Pasto / missing-coverage:** When coverage is absent, the interface explains the limitation without claiming that a legal rule was found.
