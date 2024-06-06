import React, { useState, useEffect } from "react";
import { createGrid } from "ag-grid-community";
import "./ag-grid.css";
import "./bco-dmo.css";
//import "ag-grid-community/styles/ag-grid.css";
//import "ag-grid-community/styles/ag-theme-quartz.css";

const App = ({ datapackage }) => {
  const [columnDefs, setColumnDefs] = useState([]);
  const [resourceFilename, setResourceFilename] = useState("");
  const [resourceDownloadUrl, setResourceDownloadUrl] = useState("");
  const [rowData, setRowData] = useState([]);
  const [typesGridOptions, setTypesGridOptions] = useState(null);

  const [showFieldTable, setShowFieldTable] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!datapackage) {
      setError("Missing datapackage");
    } else if (!datapackage.resources) {
      setError("Missing resources key in the datapackage");
    } else if (!datapackage.resources.length) {
      setError("There are no resources in the datapackage");
    } else {
      const resource = datapackage.resources[0];
      setError("");
      setColumnDefs(
        resource.schema.fields.map((f) => ({
          headerName: f.name,
          field: f.name,
        })),
      );

      setResourceFilename(resource.filename);
      setResourceDownloadUrl(resource.path);

      // Set the types table
      const default_types = ["any", "default"];
      setTypesGridOptions({
        animateRows: true,
        columnDefs: [
          { field: "Field" },
          { field: "Description", minWidth: 600 },
          { field: "Type", headerName: "Data Type", maxWidth: 100 },
          { field: "Format" },
        ],
        cacheQuickFilter: true,
        defaultColDef: { flex: 1, resizable: true },
        rowData: resource.schema.fields.map((f) => ({
          Field: f.name,
          Type: f.type,
          Format: default_types.includes(f.format) ? "" : f.format,
          Description: "undefined" != f.description ? f.description : "",
        })),
      });
    }
  }, [datapackage]);

  // Create main table
  useEffect(() => {
    if (columnDefs.length > 0) {
      const gridOptions = {
        columnDefs,
        rowData,
      };
      const eGridDiv = document.querySelector("#grid");
      const api = createGrid(eGridDiv, gridOptions);
    }
  }, [columnDefs, rowData]);

  // Create types table
  useEffect(() => {
    if (typesGridOptions) {
      const eGridDiv = document.querySelector("#typesGrid");
      const api = createGrid(eGridDiv, typesGridOptions);
    }
  }, [typesGridOptions]);

  if (error) {
    return (
      <h2 className="has-text-danger has-text-centered is-size-2">
        There was an error: {error}
      </h2>
    );
  }

  let fieldTableButtonText = "Hide Field Definitions Table";
  if (!showFieldTable) {
    fieldTableButtonText = "Show Field Definitions Table";
  }
  return (
    <div>
      <div className="padding-bot-1">
        <h4 className="has-text-weight-bold is-size-4">
          Download <a href={resourceDownloadUrl}>{resourceFilename}</a>
        </h4>
      </div>
      <div className="padding-bot-1">
        <button
          onClick={() => setShowFieldTable(!showFieldTable)}
          className="button is-primary is-outlined is-small margin-bot-1"
        >
          {fieldTableButtonText}
        </button>
        <div style={{ display: showFieldTable ? "" : "none" }}>
          <div
            id="typesGrid"
            className="ag-theme-quartz"
            style={{
              height: "250px",
              width: "100%",
            }}
          ></div>
        </div>
        <hr />
      </div>
      <div
        id="grid"
        className="ag-theme-quartz"
        style={{
          height: "500px",
          width: "100%",
        }}
      ></div>
    </div>
  );
};

export default App;
