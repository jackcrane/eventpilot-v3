export const samplePass = {
  formatVersion: 1,
  passTypeIdentifier: "pass.com.geteventpilot",
  teamIdentifier: "2LXR6KM7AB",
  // serialNumber: "cmcnspqxo000pqz0nmahl178r",
  organizationName: "EventPilot",
  description: "Demo pass",
  foregroundColor: "rgb(62, 62, 62)",
  backgroundColor: "rgb(212, 219, 227)",
  logoText: "EventPilot",
  webServiceURL: "https://tunnel.geteventpilot.com",
  authenticationToken: "0a0f2cfa-a08d-4dcb-aa55-2b77d1d7a2b6",
  generic: {
    headerFields: [
      {
        value: "Volunteer",
        label: "Pass Type",
        textAlignment: "PKTextAlignmentRight",
        key: "passType",
      },
    ],
    primaryFields: [
      {
        key: "title",
        label: "Title",
        value: Math.random().toString(36),
      },
    ],
    secondaryFields: [
      {
        key: "subtitle",
        label: "Locations",
        value: "Schmidt Field",
      },
    ],
    auxiliaryFields: [
      {
        key: "generatedAt",
        label: "Generated At",
        value: new Date().toISOString(),
        changeMessage: "There has been a change to this pass. (%@)",
      },
    ],
  },
};
