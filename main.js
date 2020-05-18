let tableData;

function search(text, startIndex = 0, maxRows = 10, currentPage = 1) {
  text = document.getElementById('searchInput').value;
  const xhr = new XMLHttpRequest();
  xhr.open('get', `https://www.googleapis.com/books/v1/volumes?q=${text}&startIndex=${startIndex}&maxResults=${maxRows}`);
  xhr.send();

  xhr.onload = function () {
    const data = JSON.parse(xhr.response);
    tableData = transformData(data, startIndex, maxRows);
    debugger
    createTable(tableData);
    changePage(currentPage);
  };
}


function transformData(json, startIndex, maxRows) {
  let data;
  if (json.items) {
    data = json.items.map(book => {
      return {
        id: { value: book.id, type: 'text' },
        title: { value: book.volumeInfo.title, type: 'text' },
        authors: { value: book.volumeInfo.authors, type: 'text' },
        publishedDate: { value: book.volumeInfo.publishedDate, type: 'date' },
        pages: { value: book.volumeInfo.pageCount, type: 'number' },
        categories: { value: book.volumeInfo.categories, type: 'text' },
        image: { value: extractImage(book), type: 'text' },
        language: { value: book.volumeInfo.language, type: 'text' },
      }
    })
  }
  return { items: data, totalItems: json.totalItems, startIndex, maxRows };
}

function extractImage(book) {
  if (book.volumeInfo.imageLinks && book.volumeInfo.imageLinks.smallThumbnail) {
    return book.volumeInfo.imageLinks.smallThumbnail;
  }
  return 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRcB_AhqIKo-khmdiva0r9mobPEh0aGyU0GQcF23xug2jmwE8u6xw'
}

function createTable(data) {
  const divId = 'dynamic-table';
  const tableId = 'sortable';
  const div = document.getElementById(divId);
  const placeholderEl = document.getElementsByClassName('no-data')
  const loaderEl = document.createElement('svg');
  const paginationEl = document.getElementById('pagination') 
  if (data.items) {
    if(placeholderEl[0]){
      placeholderEl[0].remove();
    }
    loaderEl.setAttribute('class', 'loader');
    loaderEl.innerHTML = '<?xml version="1.0" encoding="utf-8"?><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="margin: auto; background: none; display: block; shape-rendering: auto;" width="58px" height="58px" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid"><circle cx="50" cy="50" fill="none" stroke="#e9eaef" stroke-width="10" r="35" stroke-dasharray="164.93361431346415 56.97787143782138" transform="rotate(41.9195 50 50)"><animateTransform attributeName="transform" type="rotate" repeatCount="indefinite" dur="1s" values="0 50 50;360 50 50" keyTimes="0;1"></animateTransform></circle></svg>';
    div.append(loaderEl);
    setTimeout(() => {
      div.innerHTML = '';
      const table = new DynamicTable(tableId, data);
      div.appendChild(table);
      paginationEl.style.display = 'flex';
      new SortableTable(tableId);
    }, 500);
  } else {
    paginationEl.style.display = 'none';
    div.innerHTML = '<div class="no-data">No data to display</div>';
  }
}

function sortTextFn(list, direction) {
  list = list.sort(function (a, b) {
    if (a.value < b.value) {
      return -1;
    }
    if (a.value > b.value) {
      return 1;
    }
    return 0;
  });
  if (direction === -1) {
    list.reverse();
  }
  return list;
}

function sortDateNumberFn(list, direction, type) {
  return list.sort(function (a, b) {
    if (type == "date") {
      a.value = new Date(a.value);
      b.value = new Date(b.value);
    }

    if (direction === 1) {
      return a.value - b.value;
    } else if (direction === -1) {
      return b.value - a.value;
    }
    return 0;
  })
}

// Sort the list
function sortList(list, direction) {
  const type = list[0].type;
  if (type === 'date' || type === 'number') {
    return sortDateNumberFn(list, direction, type);
  }
  return sortTextFn(list, direction);

}

// Event triggered on heading anchor click (which will trigger the sort)
function onHeadigClick(that, cellIndex) {
  return function () {
    that.sortColumn(this, cellIndex);
    return false;
  };
}

// Create anchor for each th
function createAnchor(html, index) {
  const a = document.createElement('a');
  a.href = '#';
  a.innerHTML = html;
  a.onclick = onHeadigClick(this, index);
  return a;
}

/**
 * @param {string} id the id the table will have
 * @param {array} data json data
 */
function DynamicTable(tableId, data) {
  const headings = data.items.reduce(function (result, item) {
    const item_headings = Object.keys(item);

    item_headings.forEach(function (heading) {
      if (result.indexOf(heading) === -1) {
        result.push(heading);
      }
    });
    return result;
  }, []);

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  const thead_tr = document.createElement('tr');

  headings.forEach(function (heading) {
    const cell = document.createElement('th');
    cell.innerHTML = heading;
    thead_tr.appendChild(cell);
  });

  data.items.forEach(function (item) {
    const tbody_tr = document.createElement('tr');
    headings.forEach(function (heading) {
      const cell = document.createElement('td');
      cell.innerHTML = item[heading].value && truncate(item[heading].value, 15) || '';
      cell.setAttribute('type', item[heading].type);
      tbody_tr.appendChild(cell);
    });

    tbody.appendChild(tbody_tr);
  });
  thead.appendChild(thead_tr);
  table.appendChild(thead);
  table.appendChild(tbody);
  table.id = tableId;
  return table;
}

function truncate(str, n) {
  return (str.length > n) ? str.substr(0, n - 1) + '&hellip;' : str;
};

/**
 * @param {string} id table id
 */
function SortableTable(id) {
  this.table = document.getElementById(id);
  this.lastSortedTh = null;
  if (this.table && this.table.nodeName === 'TABLE') {
    const headings = this.table.tHead.rows[0].cells;
    Object.assign([], headings).forEach(
      function (heading, index) {
        if (heading.className.match(/ascendent_sort|descendent_sort/)) {
          this.lastSortedTh = heading;
        }
      }.bind(this),
    );
    this.setTableSortable();
  }
}

SortableTable.prototype.setTableSortable = function () {
  const headings = this.table.tHead.rows[0].cells;
  Object.assign([], headings).forEach(
    function (heading, index) {
      const sortAnchor = createAnchor.bind(this);
      const html = heading.innerHTML;
      heading.innerHTML = '';
      heading.appendChild(sortAnchor(html, index));
    }.bind(this),
  );
};

SortableTable.prototype.sortColumn = function (el, cellIndex) {
  const tBody = this.table.tBodies[0];
  const rows = this.table.rows;
  const th = el.parentNode;
  let list = [];
  Object.assign([], rows).forEach(function (row, index) {
    if (index > 0) {
      const cell = row.cells[cellIndex];
      const content = cell.textContent || cell.innerText;
      list.push({
        value: content,
        row: row,
        type: cell.getAttribute('type')
      });
    }
  });

  const hasAscendentClassName = th.className.match('ascendent_sort');
  const hasDescendentClassName = th.className.match('descendent_sort');
  list = sortList(list, hasAscendentClassName ? -1 : 1);
  if (hasAscendentClassName) {
    th.className = th.className.replace(/ascendent_sort/, 'descendent_sort');
  } else {
    if (hasDescendentClassName) {
      th.className = th.className.replace(/descendent_sort/, 'ascendent_sort');
    } else {
      th.className += 'ascendent_sort';
    }
  }

  if (this.lastSortedTh && th !== this.lastSortedTh) {
    this.lastSortedTh.className = this.lastSortedTh.className.replace(
      /descendent_sort|ascendent_sort/g,
      '',
    );
  }

  this.lastSortedTh = th;
  list.forEach(function (item, index) {
    tBody.appendChild(item.row);
  });
};
// Pagination
function prevPage() {
  if (tableData.startIndex >= 0) {
    tableData.startIndex -= tableData.maxRows;
    const currPage = tableData.startIndex / tableData.maxRows + 1;
    search(document.getElementById('searchInput').value, tableData.startIndex, tableData.maxRows, currPage)
  }
}

function nextPage() {
  if ((tableData.startIndex / tableData.maxRows) < numPages()) {
    tableData.startIndex += tableData.maxRows;
    const currPage = tableData.startIndex / tableData.maxRows + 1;
    search(document.getElementById('searchInput').value, tableData.startIndex, tableData.maxRows, currPage)
  }
}

function changePage(page) {
  const btnNext = document.getElementById("btnNext");
  const btnPrev = document.getElementById("btnPrev");
  const pageSpan = document.getElementById("page");

  // Validate page
  if (page < 1) page = 1;
  if (page > numPages()) page = numPages();
  pageSpan.innerHTML = page;
  
  if (page == 1) {
    btnPrev.style.visibility = "hidden";
  } else {
    btnPrev.style.visibility = "visible";
  }

  if (page == numPages()) {
    btnNext.style.visibility = "hidden";
  } else {
    btnNext.style.visibility = "visible";
  }
}

function numPages() {
  return Math.ceil(tableData.totalItems / tableData.maxRows);
}