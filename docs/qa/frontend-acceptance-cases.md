# Frontend acceptance cases

These are manual acceptance scenarios, not evidence that the checks have passed.

001. **Bogota D.C. / selection:** Selecting this municipality updates the jurisdiction field without changing the project description.
002. **Bogota D.C. / coverage:** The coverage status reflects the API result, including source count and section count when available.
003. **Bogota D.C. / missing-coverage:** When coverage is absent, the interface explains the limitation without claiming that a legal rule was found.
004. **Bogota D.C. / discovery:** Source discovery displays official HTTPS candidates for the selected municipality.
005. **Bogota D.C. / source-review:** A discovered source is labeled pending review until an administrator confirms and imports it.
006. **Bogota D.C. / worker:** The document worker normalizes a multiline project description without freezing text input.
007. **Bogota D.C. / validation:** A short or empty project description shows a Spanish validation message and disables submission.
