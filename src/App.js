import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import { createGrid } from "ag-grid-community";
import "./ag-grid.css";
import "./bco-dmo.css";
import "./styles.css";

const ROW_LIMIT = 50000;
const ROW_LIMIT_STR = "50,000";
const PAGE_SIZE = 50;

const dateComparator = (date1, date2) => {
  if (date1 === null && date2 === null) {
    return 0;
  }
  if (!isNaN(new Date(date1).getTime())) {
    return -1;
  }
  if (!isNaN(new Date(date2).getTime())) {
    return -1;
  }
  if (date1 === null) {
    return -1;
  }
  if (date2 === null) {
    return 1;
  }
  return Date.parse(date1) - Date.parse(date2);
};

const numberComparator = (number1, number2) => {
  if (number1 === null && number2 === null) {
    return 0;
  }
  if (isNaN(number1)) {
    return -1;
  }
  if (isNaN(number2)) {
    return 1;
  }
  if (number1 === null) {
    return -1;
  }
  if (number2 === null) {
    return 1;
  }
  return number1 - number2;
};

const App = ({ datapackage }) => {
  const [resourceFilename, setResourceFilename] = useState("");
  const [resourceDownloadUrl, setResourceDownloadUrl] = useState("");

  const [columnDefs, setColumnDefs] = useState([]);
  const [rowData, setRowData] = useState([]);
  const [gridApi, setGridApi] = useState(null);

  const [showFieldTable, setShowFieldTable] = useState(false);
  const [error, setError] = useState("");
  const [tooLarge, setTooLarge] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!datapackage) {
        setError("Missing datapackage");
      } else if (!datapackage.resources) {
        setError("Missing resources key in the datapackage");
      } else if (!datapackage.resources.length) {
        setError("There are no resources in the datapackage");
      } else {
        const resource = datapackage.resources[0];
        const path = resource.path;
        setError("");
        setResourceFilename(resource.filename);
        setResourceDownloadUrl(path);

        let columnDefs = null;
        let header = null;
        const allStrings = resource["bcodmo_all-strings"];
        if (!resource.schema || !resource.schema.fields) {
          setLoading(true);
          // We can grab the header from parsing the first 1MB of the file
          header = await new Promise((resolve) => {
            Papa.parse(path, {
              download: true,
              skipEmptyLines: true,
              // Remove header from first line
              step: (results, parser) => {
                resolve(results.data);
                parser.abort();
              },
              chunkSize: 1024 * 1024,
            });
          });
          columnDefs = header.map((h) => ({
            field: h,
            headerName: h,
            headerTooltip: h,
            filter: allStrings ? "" : "agTextColumnFilter",
            resizable: true,
            sortable: !allStrings,
          }));
          setLoading(false);
        } else {
          header = resource.schema.fields.map((f) => f.name);
          columnDefs = resource.schema.fields.map((f) => {
            const column = {
              field: f.name,
              headerName: f.name,
              headerTooltip: f.name,
              filter: "agTextColumnFilter",
              resizable: true,
              sortable: true,
            };
            switch (f.type) {
              case "date":
              case "datetime":
                column["type"] = "dateColumn";
                column["filter"] = "agDateColumnFilter";
                column["comparator"] = dateComparator;
                break;
              case "number":
              case "integer":
                column["type"] = "numberColumn";
                column["filter"] = "agNumberColumnFilter";
                column["comparator"] = numberComparator;
                break;
            }
            if (allStrings) {
              column.sortable = false;
              column.filter = "";
            }
            return column;
          });
        }

        const gridOptions = {
          columnDefs,
          rowData: null,
          immutableData: false,
          alwaysShowHorizontalScroll: true,
          domLayout: "autoHeight",
          pagination: true,
          paginationPageSize: PAGE_SIZE,
          columnTypes: {
            dateColumn: {
              filter: "agDateColumnFilter",
              filterParams: { comparator: dateComparator },
            },
            numberColumn: {
              filter: "agNumberColumnFilter",
              filterParams: { comparator: numberComparator },
            },
          },
          defaultColDef: {
            flex: 1,
            sortable: true,
            minWidth: 120,
          },
        };
        const eGridDiv = document.querySelector("#grid");
        const api = createGrid(eGridDiv, gridOptions);

        Papa.parse(path, {
          download: true,
          skipEmptyLines: true,
          // Remove header from first line
          beforeFirstChunk: (chunk) =>
            [...chunk.split("\n").slice(1)].join("\n"),
          chunk: (results, parser) => {
            setRowData((d) => {
              let rowData = [
                ...d,
                ...results.data.map((row) =>
                  row.reduce((acc, v, i) => ({ ...acc, [header[i]]: v }), {}),
                ),
              ];
              if (rowData.length > ROW_LIMIT) {
                rowData = rowData.slice(0, ROW_LIMIT);
                setTooLarge(true);
                parser.abort();
              }
              api.setGridOption("rowData", rowData);
              return rowData;
            });
          },
          complete: () => {
            // Additional HTML to add scrolling on top
            const horizontalScrollEl = document.querySelector(
              "#grid .ag-body-horizontal-scroll",
            );
            horizontalScrollEl.classList.remove("ag-scrollbar-invisible");
            document
              .querySelector("#grid .ag-header")
              .insertAdjacentElement("afterend", horizontalScrollEl);
          },
        });

        // Set the types table
        const default_types = ["any", "default"];
        const typesGridOptions = {
          columnDefs: [
            { field: "Field" },
            { field: "Description", minWidth: 600 },
            { field: "Type", headerName: "Data Type", maxWidth: 100 },
            { field: "Format" },
          ],
          rowData: !!resource.schema
            ? resource.schema.fields.map((f) => ({
                Field: f.name,
                Type: f.type,
                Format: default_types.includes(f.format) ? "" : f.format,
                Description: "undefined" != f.description ? f.description : "",
              }))
            : header.map((h) => ({
                Field: h,
                Type: "string",
                Format: "",
                Description: "",
              })),
          animateRows: true,
          cacheQuickFilter: true,
          defaultColDef: { flex: 1, resizable: true },
        };
        const typesGridDiv = document.querySelector("#typesGrid");
        createGrid(typesGridDiv, typesGridOptions);
      }
    }
    fetchData();
  }, [datapackage]);

  if (error) {
    return (
      <h2 className="has-text-danger has-text-centered is-size-2">
        There was an error: {error}
      </h2>
    );
  }
  return (
    <div>
      <div className="is-flex" style={{ justifyContent: "space-between" }}>
        <h4 className="has-text-weight-bold is-size-4">
          Download <a href={resourceDownloadUrl}>{resourceFilename}</a>
        </h4>
        <button
          onClick={() => setShowFieldTable(!showFieldTable)}
          className="button is-primary is-small margin-bot-1"
        >
          {showFieldTable ? "Hide" : "Show"} Field Information
        </button>
      </div>
      <div className="padding-bot-1">
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
      {!!tooLarge && (
        <div className="notification is-warning">
          <strong>
            This file is too large and only {ROW_LIMIT_STR} rows were streamed.
          </strong>{" "}
          Download the file to your computer if you want to view all of the
          rows.
        </div>
      )}
      {!!loading && (
        <div className="is-flex" style={{ justifyContent: "center" }}>
          <div className="loader margin-top-1"></div>
        </div>
      )}
      <div
        id="grid"
        className="ag-theme-quartz"
        style={{
          minHeight: "400px",
          width: "100%",
        }}
      ></div>
    </div>
  );
};

export default App;
