import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import { createGrid } from "ag-grid-community";
import {
  ICellRendererComp,
  ICellRendererParams,
} from "@ag-grid-community/core";
import dayjs from "dayjs";
import "dayjs/plugin/customParseFormat";
import "./ag-grid.css";
import "./bco-dmo.css";
import "./styles.css";

const ROW_LIMIT = 50000;
const ROW_LIMIT_STR = "50,000";
const PAGE_SIZE = 50;

const byteFormat = (bytes) => {
  const bytesReplaced = `${bytes}`.replace(/[^0-9.]/g, "");
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const bytesNum = parseInt(bytesReplaced);
  if (bytesNum <= 0 || isNaN(bytesNum)) return "0 B";
  const i = Math.floor(Math.log(bytesNum) / Math.log(1024));
  return (bytesNum / Math.pow(1024, i)).toFixed(2) + " " + sizes[i];
};

const dateComparator = (format) => {
  const jsFormat = convertPYDateFormatToJS(format);
  return (date1, date2) => {
    if (date1 === null && date2 === null) {
      return 0;
    }
    const parsedDate1 = dayjs(date1, jsFormat).toDate();
    const parsedDate2 = dayjs(date2, jsFormat).toDate();

    if (date1 === null || parsedDate1 === null) {
      return 1;
    }
    if (date2 === null || parsedDate2 === null) {
      return -1;
    }
    return parsedDate2 - parsedDate1;
  };
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

/* Key: Python format
 * Value: Javascript format
 */
const pyToJSDateFormats = Object.freeze({
  "%A": "dddd", //Weekday as locale’s full name: (In English: Sunday, .., Saturday)(Auf Deutsch: Sonntag, .., Samstag)
  "%a": "ddd", //Weekday abbreivated: (In English: Sun, .., Sat)(Auf Deutsch: So, .., Sa)
  "%B": "MMMM", //Month name: (In English: January, .., December)(Auf Deutsch: Januar, .., Dezember)
  "%b": "MMM", //Month name abbreviated: (In English: Jan, .., Dec)(Auf Deutsch: Jan, .., Dez)
  "%c": "ddd MMM DD HH:mm:ss YYYY", //Locale’s appropriate date and time representation: (English: Sun Oct 13 23:30:00 1996)(Deutsch: So 13 Oct 22:30:00 1996)
  "%d": "DD", //Day 0 padded: (01, .., 31)
  "%f": "SSS", //Microseconds 0 padded: (000000, .., 999999)
  "%H": "HH", //Hour (24-Hour) 0 padded: (00, .., 23)
  "%I": "hh", //Hour (12-Hour) 0 padded: (01, .., 12)
  "%j": "DDDD", //Day of Year 0 padded: (001, .., 366)
  "%M": "mm", //Minute 0 padded: (01, .. 59)
  "%m": "MM", //Month 0 padded: (01, .., 12)
  "%p": "A", //Locale equivalent of AM/PM: (EN: AM, PM)(DE: am, pm)
  "%S": "ss", //Second 0 padded: (00, .., 59)
  "%U": "ww", //Week # of Year (Sunday): (00, .., 53)  All days in a new year preceding the first Sunday are considered to be in week 0.
  "%W": "ww", //Week # of Year (Monday): (00, .., 53)  All days in a new year preceding the first Monday are considered to be in week 0.
  "%w": "d", //Weekday as #: (0, 6)
  "%X": "HH:mm:ss", //Locale's appropriate time representation: (EN: 23:30:00)(DE: 23:30:00)
  "%x": "MM/DD/YYYY", //Locale's appropriate date representation: (None: 02/14/16)(EN: 02/14/16)(DE: 14.02.16)
  "%Y": "YYYY", //Year as #: (1970, 2000, 2038, 292,277,026,596)
  "%y": "YY", //Year without century 0 padded: (00, .., 99)
  "%Z": "z", //Time zone name: ((empty), UTC, EST, CST) (empty string if the object is naive).
  "%z": "ZZ", //UTC offset in the form +HHMM or -HHMM: ((empty), +0000, -0400, +1030) Empty string if the the object is naive.
  "%%": "%", //A literal '%' character: (%)
});

/*
 * Description: Convert a python format string to javascript format string
 * Example:     "%m/%d/%Y" to "MM/DD/YYYY"
 * @param:  formatStr is the python format string
 * @return: the javascript format string
 */
function convertPYDateFormatToJS(formatStr) {
  if (formatStr) {
    for (let key in pyToJSDateFormats) {
      formatStr = formatStr.split(key).join(pyToJSDateFormats[key]);
    }
    return formatStr;
  }
  return "";
}

class CustomLoadingOverlay {
  // mandatory methods
  init() {
    this.eGui = document.createElement("div");
    this.eGui.innerHTML = `<div class="loader margin-top-1"></div>`;
  }

  getGui() {
    return this.eGui;
  }
}

const App = ({ datapackage }) => {
  const [resourceFilename, setResourceFilename] = useState("");
  const [resourceSize, setResourceSize] = useState("");
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
        setResourceSize(resource.size);
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
              error: (err) => {
                setLoading(false);
                setError(
                  "The file download link didn't work. Please try refreshing the page.",
                );
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
                column["filter"] = "agDateColumnFilter";
                column["filterParams"] = {
                  comparator: dateComparator(f.format),
                };
                break;
              case "number":
              case "integer":
                column["filter"] = "agNumberColumnFilter";
                column["comparator"] = numberComparator;
                // Setting the value getter ensures that the string typed cells are processed as numbers for filtering and sorting
                column["valueGetter"] = (params) => {
                  return (
                    parseFloat(params.data[f.name]) ||
                    (parseFloat(params.data[f.name]) == 0 ? 0 : "")
                  );
                };
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
          defaultColDef: {
            flex: 1,
            sortable: true,
            minWidth: 120,
          },
          loadingOverlayComponent: CustomLoadingOverlay,
        };
        const eGridDiv = document.querySelector("#grid");
        const api = createGrid(eGridDiv, gridOptions);

        Papa.parse(path, {
          download: true,
          error: (err) => {
            setLoading(false);
            setError(
              "The file download link didn't work. Please try refreshing the page.",
            );
          },
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
            { field: "Description" },
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
        <strong>There was an error:</strong> {error}
      </h2>
    );
  }
  return (
    <div>
      <div
        className="is-flex"
        style={{ justifyContent: "space-between", flexWrap: "wrap" }}
      >
        <div
          className="column is-flex "
          style={{
            flexWrap: "wrap-reverse",
            alignItems: "center",
            maxWidth: "100%",
          }}
        >
          <a
            href={resourceDownloadUrl}
            className="button is-primary margin-right-1"
          >
            Download
            {resourceSize ? ` (${byteFormat(resourceSize)})` : ""}
          </a>
          <h4
            className="is-size-4 margin-right-1"
            style={{
              wordWrap: "break-word",
              whiteSpace: "normal",
              maxWidth: "100%",
            }}
          >
            <span className="is-italic has-text-weight-bold">
              {resourceFilename}
            </span>
          </h4>
        </div>
        <div className="column is-narrow">
          <button
            onClick={() => setShowFieldTable(!showFieldTable)}
            className="button is-info"
          >
            {showFieldTable ? "Hide" : "Show"} Field Information
          </button>
        </div>
      </div>
      <div
        className="padding-bot-1"
        style={{ display: showFieldTable ? "" : "none" }}
      >
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
