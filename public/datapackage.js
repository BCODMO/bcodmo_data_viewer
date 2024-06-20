const dp = {
  name: "datapackage",
  profile: "data-package",
  resources: [
    {
      name: "dataset-926873",
      filename:
        "926873_v1_dissolved_hg_speciation_california_current_system.csv",
      mediatype: "text/csv",
      encoding: "utf-8",
      size: "24565",
      profile: "tabular-data-resource",
      path: "https://datadocs.bco-dmo.org/file/N7GqOBoFj54g20/926873_v1_dissolved_hg_speciation_california_current_system.csv",
      title: "926873_v1_dissolved_hg_speciation_california_current_system.csv",
      description: "Primary data file for dataset ID 926873, version 1",
      "bcodmo:": {
        fields: [
          {
            format: "default",
            name: "Water_Mass",
            description: "Identification of water mass\n",
            units: "unitless",
            type: "string",
          },
          {
            format: "default",
            name: "Station_Name",
            description: "Name of the station\n",
            units: "unitless",
            type: "string",
          },
          {
            format: "%Y-%m-%dT%H:%M",
            name: "ISO_DateTime_PDT",
            description:
              "Sampling date and time in ISO 8601 format in Pacific  Daylight Time (PDT) time zone\n",
            units: "unitless",
            type: "datetime",
          },
          {
            format: "%Y-%m-%dT%H:%MZ",
            name: "ISO_DateTime_UTC",
            description:
              "Sampling date and time in ISO 8601 format in UTC time zone\n",
            units: "unitless",
            type: "datetime",
          },
          {
            format: "default",
            name: "Latitude",
            description: "Station latitude, south is negative\n",
            units: "decimal degrees",
            type: "number",
          },
          {
            format: "default",
            name: "Longitude",
            description: "Station longitude, west is negative\n",
            units: "decimal degrees",
            type: "number",
          },
          {
            format: "default",
            name: "Trace_Metal_Cast_Num",
            description: "Cast number\n",
            units: "unitless",
            type: "integer",
          },
          {
            format: "default",
            name: "Depth_m",
            description: "Sample depth\n",
            units: "meters (m)",
            type: "number",
          },
          {
            format: "default",
            name: "Temperature_C",
            description: "Sample temperature\n",
            units: "degrees Celsius",
            type: "number",
          },
          {
            format: "default",
            name: "Salinity_PSU",
            description: "Sample salinity\n",
            units: "practical salinity units (PSU)",
            type: "number",
          },
          {
            format: "default",
            name: "Oxygen_umol_kg",
            description: "Dissolved oxygen concentration\n",
            units: "micromole per kilogram (umol/kg)",
            type: "number",
          },
          {
            format: "default",
            name: "Density_kg_m3",
            description: "Water density\n",
            units: "kilogram per cubed meter (kg/m^3)",
            type: "number",
          },
          {
            format: "default",
            name: "DMHg_fM",
            description:
              "Concentration of dimethylmercury; limit of detection = 2\n",
            units: "femtomolar (fM)",
            type: "number",
          },
          {
            format: "default",
            name: "DMHg_Flag",
            description:
              "Data flag, 0 indicates that the data was used in analyses, 1 indicates that the data was removed from subsequent analysis as it was 1.5*IQR above the upper whisker when the data was plotted as a box plot\n",
            units: "unitless",
            type: "integer",
          },
          {
            format: "default",
            name: "Hg0_fM",
            description:
              "Concentration of elemental mercury; limit of detection = 40\n",
            units: "femtomolar (fM)",
            type: "number",
          },
          {
            format: "default",
            name: "Hg0_Flag",
            description:
              "Data flag, 0 indicates that the data was used in analyses, 1 indicates that the data was removed from subsequent analysis as it was 1.5*IQR above the upper whisker when the data was plotted as a box plot\n",
            units: "unitless",
            type: "integer",
          },
          {
            format: "default",
            name: "MMHg_fM",
            description:
              "Concentration of dissolved monomethylmercury; limit of detection = 11.3\n",
            units: "femtomolar (fM)",
            type: "number",
          },
          {
            format: "default",
            name: "MMHg_Flag",
            description:
              "Data flag, 0 indicates that the data was used in analyses, 1 indicates that the data was removed from subsequent analysis as it was 1.5*IQR above the upper whisker when the data was plotted as a box plot\n",
            units: "unitless",
            type: "integer",
          },
          {
            format: "default",
            name: "THg_pM",
            description:
              "Concentration of dissolved total mercury; limit of detection = 0.22\n",
            units: "picomolar (pM)",
            type: "number",
          },
          {
            format: "default",
            name: "THg_Flag",
            description:
              "Data flag, 0 indicates that the data was used in analyses, 1 indicates that the data was removed from subsequent analysis as it was 1.5*IQR above the upper whisker when the data was plotted as a box plot\n",
            units: "unitless",
            type: "integer",
          },
        ],
      },
      schema: {
        fields: [
          {
            name: "Water_Mass",
            type: "string",
          },
          {
            name: "Station_Name",
            type: "string",
          },
          {
            name: "ISO_DateTime_PDT",
            type: "datetime",
          },
          {
            name: "ISO_DateTime_UTC",
            type: "datetime",
          },
          {
            name: "Latitude",
            type: "number",
          },
          {
            name: "Longitude",
            type: "number",
          },
          {
            name: "Trace_Metal_Cast_Num",
            type: "integer",
          },
          {
            name: "Depth_m",
            type: "number",
          },
          {
            name: "Temperature_C",
            type: "number",
          },
          {
            name: "Salinity_PSU",
            type: "number",
          },
          {
            name: "Oxygen_umol_kg",
            type: "number",
          },
          {
            name: "Density_kg_m3",
            type: "number",
          },
          {
            name: "DMHg_fM",
            type: "number",
          },
          {
            name: "DMHg_Flag",
            type: "integer",
          },
          {
            name: "Hg0_fM",
            type: "number",
          },
          {
            name: "Hg0_Flag",
            type: "integer",
          },
          {
            name: "MMHg_fM",
            type: "number",
          },
          {
            name: "MMHg_Flag",
            type: "integer",
          },
          {
            name: "THg_pM",
            type: "number",
          },
          {
            name: "THg_Flag",
            type: "integer",
          },
        ],
      },
    },
  ],
};
