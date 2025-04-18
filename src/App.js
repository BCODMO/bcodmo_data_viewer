import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import { createGrid } from "ag-grid-community";
import dayjs from "dayjs";
import dayjsPluginUTC from "dayjs-plugin-utc";
dayjs.extend(dayjsPluginUTC);
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

const dateComparator = (jsFormat) => {
  return (queryDate, dataDate) => {
    if (queryDate === null && dataDate === null) {
      return 0;
    }
    const parsedQueryDayjs = dayjs(queryDate, jsFormat);
    let parsedDataDayjs = dayjs.utc(dataDate, jsFormat);
    if (jsFormat.endsWith("Z")) {
      const tzOffset = new Date().getTimezoneOffset();
      parsedDataDayjs = parsedDataDayjs.utcOffset(tzOffset, true);
    }

    if (queryDate === null || parsedQueryDayjs === null) {
      return 1;
    }
    if (dataDate === null || parsedDataDayjs === null) {
      return -1;
    }

    if (parsedQueryDayjs.year() !== parsedDataDayjs.year()) {
      return parsedDataDayjs.year() - parsedQueryDayjs.year();
    }
    return (
      parsedDataDayjs.month() * 40 +
      parsedDataDayjs.date() -
      (parsedQueryDayjs.month() * 40 + parsedQueryDayjs.date())
    );
  };
};

const numberComparator = (number1, number2) => {
  const number1Float = parseFloat(number1);
  const number2Float = parseFloat(number2);

  if (isNaN(number1Float) && isNaN(number2Float)) {
    return 0;
  }

  if (isNaN(number1Float)) {
    return -1;
  }
  if (isNaN(number2Float)) {
    return 1;
  }
  return number1Float - number2Float;
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

const generateAgGridCol = (f, allStrings) => {
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
      const jsFormat = convertPYDateFormatToJS(f.format);
      column["filterParams"] = {
        comparator: dateComparator(jsFormat),
      };
      break;
    case "number":
    case "integer":
      column["filter"] = "agNumberColumnFilter";
      column["filterValueGetter"] = (params) => {
        return (
          parseFloat(params.data[f.name]) ||
          (parseFloat(params.data[f.name]) == 0 ? 0 : "")
        );
      };

      column["comparator"] = numberComparator;
      // Commented this out because it is removing precision with trailing zeros. Filtering and sorting seem to work fine
      /*
                // Setting the value getter ensures that the string typed cells are processed as numbers for filtering and sorting
                column["valueGetter"] = (params) => {
                  return (
                    parseFloat(params.data[f.name]) ||
                    (parseFloat(params.data[f.name]) == 0 ? 0 : "")
                  );
                };
                */
      break;
  }
  if (allStrings) {
    column.sortable = false;
    column.filter = "";
  }
  return column;
};

const App = ({ datapackage }) => {
  const [resourceFilename, setResourceFilename] = useState("");
  const [resourceSize, setResourceSize] = useState("");
  const [resourceDownloadUrl, setResourceDownloadUrl] = useState("");
  const [complete, setComplete] = useState(false);

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
        let fields = null;
        // There are three places we can get field definitions from
        // 1. resource.schema.fields
        //    - From here we use the field definitions for the units table
        //    AND for the main table column order/typing
        //
        // 2. resource["bcodmo"].fields
        //    - From here we use the field definitions for the units table
        //    BUT we stream the first row to get the main table column order.
        //    We then try to match fields from the first row with fields in fields object
        //
        // 3. No fields
        //    - We stream the first rows to get the units table (all strings)
        //    and the main table column order (all strings).
        //
        let streamHeader = true;
        if (resource.schema && resource.schema.fields) {
          fields = resource.schema.fields;
          streamHeader = false;
        } else if ("bcodmo:" in resource && resource["bcodmo:"].fields) {
          fields = resource["bcodmo:"].fields;
        }
        if (streamHeader) {
          // If there are no fields, or if the fields come from `["bcodmo:"].fields`,
          // we pull the header from the first lines of the file and use that

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
                setComplete(true);
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
          if (fields) {
            const fieldsDict = fields.reduce((acc, field) => {
              acc[field.name] = field;
              return acc;
            }, {});
            columnDefs = columnDefs.map((columnDef) => {
              if (columnDef.field in fieldsDict) {
                return generateAgGridCol(
                  fieldsDict[columnDef.field],
                  allStrings,
                );
              }
              return columnDef;
            });
            // TODO
          }
          setLoading(false);
        } else {
          header = fields.map((f) => f.name);
          columnDefs = fields.map((f) => {
            return generateAgGridCol(f, allStrings);
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
            setComplete(true);
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
            setComplete(true);
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
            { field: "Units" },
            {
              field: "Description",
              // This lets us render HTML for the description
              cellRenderer: function (params) {
                return params.value ? params.value : "";
              },
            },
            { field: "Type", headerName: "Data Type", maxWidth: 100 },
            { field: "Format" },
          ],
          rowData: !!fields
            ? fields.map((f) => ({
                Field: f.name,
                Units: f.units,
                Type: f.type,
                Format: default_types.includes(f.format) ? "" : f.format,
                Description: "undefined" != f.description ? f.description : "",
              }))
            : header.map((h) => ({
                Field: h,
                Units: "",
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
            target="_blank"
            rel="noopener noreferrer"
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
        <div className="column is-narrow is-flex" style={{ gap: "1rem" }}>
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
      {!!rowData.length && !complete && !tooLarge && (
        <div
          className="notification is-info is-flex"
          style={{ justifyContent: "space-between", alignItems: "center" }}
        >
          The file is still downloading, but the initial rows are being shown...
          <div className="loader is-small"></div>
        </div>
      )}
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
