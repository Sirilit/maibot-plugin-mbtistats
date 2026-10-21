var MbtistatsDashboardBundle = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/scripts.mjs
  var scripts_exports = {};
  __export(scripts_exports, {
    setupCharts: () => setupCharts
  });

  // src/dashboard-class.mjs
  var echarts = window.echarts;
  var MbtistatsDashboard = class {
    constructor(data) {
      this.echarts = echarts;
      this.typeRawData = data.typeRawData ?? [];
      this.traitRawData = data.traitRawData ?? {};
      this.typeHistoryData = this.normalizeHistoryData(data.typeHistoryData ?? []);
      this.traitHistoryData = this.normalizeHistoryData(data.traitHistoryData ?? []);
      this.pieChart = echarts.init(document.getElementById("pie-chart-container"));
      this.barChart = echarts.init(document.getElementById("bar-chart-container"));
      this.trendWindowsDom = document.getElementById("trend-windows-container");
      this.trendWindowRefs = {
        week: {
          card: document.getElementById("trend-window-week"),
          type16Dom: document.getElementById("trend-week-type16"),
          type4Dom: document.getElementById("trend-week-type4")
        },
        month: {
          card: document.getElementById("trend-window-month"),
          type16Dom: document.getElementById("trend-month-type16"),
          type4Dom: document.getElementById("trend-month-type4")
        },
        year: {
          card: document.getElementById("trend-window-year"),
          type16Dom: document.getElementById("trend-year-type16"),
          type4Dom: document.getElementById("trend-year-type4")
        },
        all: {
          card: document.getElementById("trend-window-all"),
          type16Dom: document.getElementById("trend-all-type16"),
          type4Dom: document.getElementById("trend-all-type4")
        }
      };
      this.eiChart = echarts.init(document.getElementById("chart-ei"));
      this.nsChart = echarts.init(document.getElementById("chart-ns"));
      this.tfChart = echarts.init(document.getElementById("chart-tf"));
      this.jpChart = echarts.init(document.getElementById("chart-jp"));
      this.tableContainer = document.getElementById("history-table-container");
      this.traitTableContainer = document.getElementById("trait-history-table-container");
      this.mbtiConfig = [
        // NT分析家 (紫色系)
        { type: "INTP", color: "#E8D9FF" },
        { type: "ENTP", color: "#D469FF" },
        { type: "INTJ", color: "#C79FF3" },
        { type: "ENTJ", color: "#A14BFF" },
        // NF外交家 (绿色系)
        { type: "INFP", color: "#A9D18E" },
        { type: "ENFP", color: "#70AD47" },
        { type: "INFJ", color: "#548235" },
        { type: "ENFJ", color: "#385723" },
        // SJ守护者 (蓝色系)
        { type: "ISTJ", color: "#2E75B6" },
        { type: "ESTJ", color: "#9DC3E6" },
        { type: "ISFJ", color: "#BDD7EE" },
        { type: "ESFJ", color: "#DEEBF7" },
        // SP探险家 (黄色系)
        { type: "ISTP", color: "#BF9000" },
        { type: "ESTP", color: "#FFD356" },
        { type: "ISFP", color: "#FB9800" },
        { type: "ESFP", color: "#FFB703" }
      ];
      this.colorMap = this.mbtiConfig.reduce((acc, item) => {
        acc[item.type] = item.color;
        return acc;
      }, {});
      this.defaultColor = "#cccccc";
      this.traitConfig = [
        { id: "chart-ei", rawKey: "EI", traits: ["I", "E", "X"], labels: ["I", "E", "未知"], colors: ["#EEAB7E", "#8EBBE6", "#ccc"] },
        { id: "chart-ns", rawKey: "SN", traits: ["N", "S", "X"], labels: ["N", "S", "未知"], colors: ["#89D18B", "#FFD863", "#ccc"] },
        { id: "chart-tf", rawKey: "TF", traits: ["F", "T", "X"], labels: ["F", "T", "未知"], colors: ["#d4a5a5", "#9e9ac8", "#ccc"] },
        { id: "chart-jp", rawKey: "JP", traits: ["P", "J", "X"], labels: ["P", "J", "未知"], colors: ["#80b1d3", "#fdb462", "#ccc"] }
      ];
    }
    normalizeHistoryData(data) {
      if (!Array.isArray(data)) return [];
      return data.filter((item) => item && Number.isFinite(item.timestamp)).slice().sort((a, b) => a.timestamp - b.timestamp);
    }
    renderTimestamp() {
      const date = /* @__PURE__ */ new Date();
      document.getElementById("timestamp").textContent = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.toLocaleTimeString()}`;
    }
    renderTypeHistoryTable() {
      if (!this.typeHistoryData || this.typeHistoryData.length === 0) return;
      let tableHTML = "<table>";
      tableHTML += "<thead><tr><th>日期</th>";
      const allTypes = [...new Set(this.typeHistoryData.flatMap(
        (record) => record.data.filter((item) => item.value > 0).map((item) => item.name)
      ))].sort();
      allTypes.forEach((type) => {
        tableHTML += `<th>${type}</th>`;
      });
      tableHTML += "</tr></thead><tbody>";
      this.typeHistoryData.toReversed().forEach((record) => {
        const d = new Date(record.timestamp);
        const dateStr = `${d.getMonth() + 1}-${d.getDate()}`;
        tableHTML += `<tr><td>${dateStr}</td>`;
        allTypes.forEach((type) => {
          const item = record.data.find((x) => x.name === type);
          tableHTML += `<td>${item ? item.value : 0}</td>`;
        });
        tableHTML += "</tr>";
      });
      tableHTML += "</tbody></table>";
      this.tableContainer.innerHTML = tableHTML;
    }
    renderTraitHistoryTable() {
      if (!this.traitHistoryData || this.traitHistoryData.length === 0) return;
      let tableHTML = "<table>";
      tableHTML += "<thead><tr><th>日期</th>";
      const allDimensions = ["EI", "SN", "TF", "JP"];
      const allTraits = {
        EI: ["E", "I", "X"],
        SN: ["S", "N", "X"],
        TF: ["T", "F", "X"],
        JP: ["J", "P", "X"]
      };
      allDimensions.forEach((dim) => {
        allTraits[dim].forEach((trait) => {
          tableHTML += `<th>${dim}-${trait}</th>`;
        });
      });
      tableHTML += "</tr></thead><tbody>";
      this.traitHistoryData.toReversed().forEach((record) => {
        const d = new Date(record.timestamp);
        const dateStr = `${d.getMonth() + 1}-${d.getDate()}`;
        tableHTML += `<tr><td>${dateStr}</td>`;
        allDimensions.forEach((dim) => {
          const dimData = record.data[dim] || {};
          allTraits[dim].forEach((trait) => {
            tableHTML += `<td>${dimData[trait] || 0}</td>`;
          });
        });
        tableHTML += "</tr>";
      });
      tableHTML += "</tbody></table>";
      this.traitTableContainer.innerHTML = tableHTML;
    }
    setupAll() {
      this.renderTimestamp();
      this.renderTopPersonality();
      this.renderTypeSummary();
      this.renderTrendCharts();
      this.renderTraitPies();
      this.renderTypeHistoryTable();
      this.renderTraitHistoryTable();
    }
  };

  // src/top-personality.mjs
  MbtistatsDashboard.prototype.renderTopPersonality = function() {
    let maxCount = 0;
    const topPersonalities = [];
    this.typeRawData.forEach((item) => {
      if (item.value > maxCount) {
        maxCount = item.value;
        topPersonalities.length = 0;
        topPersonalities.push(item.name);
      } else if (item.value === maxCount && item.value > 0) {
        topPersonalities.push(item.name);
      }
    });
    const textContainer = document.getElementById("top-personality-text");
    if (topPersonalities.length === 0) {
      textContainer.textContent = "暂无统计数据";
    } else if (topPersonalities.length === 1) {
      textContainer.textContent = `本次统计最多的人格是${topPersonalities[0]}`;
    } else {
      textContainer.textContent = `本次统计最多的类型是${topPersonalities.join("、")}`;
    }
    const imageContainer = document.getElementById("top-personality-image");
    imageContainer.innerHTML = "";
    if (topPersonalities.length === 0) {
      imageContainer.innerHTML = '<div class="purple-placeholder"></div>';
      return;
    }
    const wrapper = document.createElement("div");
    wrapper.className = `top-personality-wrapper top-personality-count-${topPersonalities.length}`;
    const rowCount = topPersonalities.length > 3 ? 2 : 1;
    const itemsPerRow = Math.ceil(topPersonalities.length / rowCount);
    for (let i = 0; i < rowCount; i++) {
      const rowItems = topPersonalities.slice(i * itemsPerRow, (i + 1) * itemsPerRow);
      wrapper.appendChild(createRow(rowItems, this.colorMap));
    }
    imageContainer.appendChild(wrapper);
  };
  function createRow(types, colorMap) {
    const row = document.createElement("div");
    row.className = "top-personality-row";
    types.forEach((type) => {
      row.appendChild(createImageElement(type, colorMap[type] || "#cccccc"));
    });
    return row;
  }
  function createImageElement(type, color) {
    const img = document.createElement("img");
    img.src = `../images/${type}.png`;
    img.alt = `${type}人格图片`;
    img.className = "top-personality-img";
    img.onerror = function() {
      this.style.display = "none";
      const placeholder = document.createElement("div");
      placeholder.className = "type-placeholder";
      placeholder.style.backgroundColor = color;
      placeholder.textContent = type;
      this.parentNode.appendChild(placeholder);
    };
    const container = document.createElement("div");
    container.className = "top-personality-item";
    container.appendChild(img);
    return container;
  }

  // src/type-summary.mjs
  MbtistatsDashboard.prototype.renderTypeSummary = function() {
    let pieData = [];
    const typeDataMap = this.typeRawData.reduce((acc, item) => {
      acc[item.name] = item;
      return acc;
    }, {});
    const totalValue = this.typeRawData.reduce((sum, item) => sum + item.value, 0);
    let accumValue = 0;
    const computeDynamicLine = (value, accum) => {
      const percent = value / totalValue * 100;
      const midValue = accum + value / 2;
      const angleRaw = 90 - midValue / totalValue * 360;
      const angle = (angleRaw + 360) % 360;
      const isTop = angle > 0 && angle < 180;
      let len1;
      let len2;
      if (isTop) {
        len1 = Math.max(15, 50 * Math.exp(-0.08 * percent));
        len2 = Math.max(15, 20 * Math.exp(-0.08 * percent));
      } else {
        len1 = Math.max(15, 20 * Math.exp(-0.5 * percent));
        len2 = Math.max(15, 20 * Math.exp(-0.5 * percent));
      }
      return { length: len1, length2: len2 };
    };
    this.mbtiConfig.forEach((config) => {
      const item = typeDataMap[config.type];
      if (!item) return;
      pieData.push({
        ...item,
        itemStyle: { color: config.color },
        labelLine: computeDynamicLine(item.value, accumValue)
      });
      accumValue += item.value;
    });
    this.typeRawData.forEach((item) => {
      if (this.colorMap[item.name]) return;
      if (item.value === 0) return;
      pieData.push({
        ...item,
        itemStyle: { color: this.defaultColor },
        labelLine: computeDynamicLine(item.value, accumValue)
      });
      accumValue += item.value;
    });
    this.pieChart.setOption({
      backgroundColor: "#ffffff",
      textStyle: { fontFamily: "Noto Sans SC, Microsoft YaHei, sans-serif" },
      title: { text: "类型分布", left: "center" },
      tooltip: { trigger: "item", formatter: "{b}: {c}人 ({d}%)" },
      series: [
        {
          name: "MBTI 分布",
          type: "pie",
          radius: ["35%", "60%"],
          center: ["50%", "52%"],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 5, borderColor: "#fff", borderWidth: 2 },
          label: {
            show: true,
            position: "outside",
            formatter: function(params) {
              const percent = params.percent >= 1 ? params.percent.toFixed(0) : params.percent >= 0.1 ? params.percent.toFixed(1) : params.percent.toFixed(2);
              return `{title|${params.name}}
{sub|${percent}%}`;
            },
            rich: {
              title: {
                color: "#333",
                fontSize: 12,
                fontWeight: "bold",
                align: "center",
                padding: [2, 0]
              },
              sub: { color: "#666", fontSize: 10, align: "center" }
            },
            lineHeight: 12,
            overflow: "break",
            width: 60
          },
          labelLine: {
            show: true,
            length: 10,
            length2: 15,
            smooth: true
          },
          data: pieData.filter((item) => item.value > 0)
        }
      ]
    });
    const barData = pieData;
    const categories = barData.map((item) => item.name);
    this.barChart.setOption({
      backgroundColor: "#ffffff",
      textStyle: { fontFamily: "Noto Sans SC, Microsoft YaHei, sans-serif" },
      title: { text: "类型统计", left: "center" },
      tooltip: { trigger: "item", formatter: "{b}: {c}人" },
      grid: { left: "8%", right: "15%", top: "10%", bottom: "0%", containLabel: true },
      xAxis: { type: "value", boundaryGap: [0, 0.01], splitLine: { show: false } },
      yAxis: {
        type: "category",
        data: categories,
        inverse: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { fontSize: 12, fontWeight: "bold", color: "#333" }
      },
      series: [
        {
          name: "人数统计",
          type: "bar",
          data: barData,
          label: { show: true, position: "right", formatter: "{c}人", color: "#666" },
          barWidth: "60%",
          itemStyle: { borderRadius: [5, 5, 5, 5] }
        }
      ]
    });
  };

  // src/trend-charts.mjs
  var DAY_MS = 24 * 3600 * 1e3;
  var TREND_CHART_WIDTH_PX = 450;
  var TREND_POINT_SIZE_PX = 6;
  var TREND_CONTINUITY_GAP_PX = TREND_POINT_SIZE_PX * 2;
  var TREND_SAMPLE_GAP_PX = 3;
  function nextPowerOfTwo(value) {
    let n = 1;
    while (n < value) n <<= 1;
    return n;
  }
  function startOfDay(timestamp) {
    const d = new Date(timestamp);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  function startOfNextDay(timestamp) {
    return startOfDay(timestamp + DAY_MS);
  }
  function addDays(timestamp, days) {
    return timestamp + days * DAY_MS;
  }
  function addMonths(timestamp, months) {
    const d = new Date(timestamp);
    d.setMonth(d.getMonth() + months);
    return d.getTime();
  }
  function addYears(timestamp, years) {
    const d = new Date(timestamp);
    d.setFullYear(d.getFullYear() + years);
    return d.getTime();
  }
  function isSpanLessThanCalendarMonths(start, end, months) {
    return addMonths(start, months) > end;
  }
  function isSpanLessThanCalendarYears(start, end, years) {
    return addYears(start, years) > end;
  }
  function computeRenderResolutions(start, end, chartWidthPx = TREND_CHART_WIDTH_PX) {
    const span = Math.max(1, end - start);
    const safeChartWidthPx = Math.max(200, chartWidthPx);
    const msPerPixel = span / safeChartWidthPx;
    const continuityResolution = Math.max(1, Math.round(msPerPixel * TREND_CONTINUITY_GAP_PX));
    const rawSampleResolution = Math.max(1, Math.ceil(msPerPixel * TREND_SAMPLE_GAP_PX));
    const sampleResolution = nextPowerOfTwo(rawSampleResolution);
    return { continuityResolution, sampleResolution };
  }
  function buildTrendWindows(history) {
    if (!history || history.length < 2) return [];
    const minTs = history[0].timestamp;
    const maxTs = history[history.length - 1].timestamp;
    const totalSpan = maxTs - minTs;
    const end = startOfNextDay(Date.now());
    const windows = [];
    const addWindow = (key, label, start, endTs) => {
      if (start < endTs) windows.push({ key, label, start, end: endTs });
    };
    if (totalSpan < 7 * DAY_MS) {
      const allStart2 = totalSpan >= DAY_MS ? startOfDay(minTs) : minTs;
      const allEnd2 = totalSpan >= DAY_MS ? startOfNextDay(maxTs) : maxTs;
      addWindow("all", "全历史记录图", allStart2, allEnd2);
      return windows;
    }
    const weekStart = startOfDay(addDays(end, -6));
    addWindow("week", "一周趋势图", weekStart, end);
    if (!isSpanLessThanCalendarMonths(minTs, maxTs, 2)) {
      const monthStart = startOfDay(addDays(addMonths(end, -1), 1));
      addWindow("month", "一月趋势图", monthStart, end);
    }
    if (!isSpanLessThanCalendarYears(minTs, maxTs, 2)) {
      const yearStart = startOfDay(addDays(addYears(end, -1), 1));
      addWindow("year", "一年趋势图", yearStart, end);
    }
    const allStart = startOfDay(minTs);
    const allEnd = startOfNextDay(maxTs);
    addWindow("all", "全历史记录图", allStart, allEnd);
    return windows;
  }
  function triangleAreaScore(aTime, aVec, bTime, bVec, cTime, cVec) {
    const dim = Math.min(aVec.length, bVec.length, cVec.length);
    let score = 0;
    for (let i = 0; i < dim; i += 1) {
      const area = Math.abs(
        aTime * (bVec[i] - cVec[i]) + bTime * (cVec[i] - aVec[i]) + cTime * (aVec[i] - bVec[i])
      ) / 2;
      score += area;
    }
    return score;
  }
  function getBucketCenter(points, lttbReference) {
    if (!points || points.length === 0) return null;
    if (points.length === 1) {
      return { timestamp: points[0].timestamp, vector: lttbReference(points[0].data) };
    }
    let timestampSum = 0;
    const firstVector = lttbReference(points[0].data);
    const vectorSum = new Array(firstVector.length).fill(0);
    points.forEach((point) => {
      timestampSum += point.timestamp;
      const vector = lttbReference(point.data);
      for (let i = 0; i < vectorSum.length; i += 1) {
        vectorSum[i] += vector[i] ?? 0;
      }
    });
    return {
      timestamp: timestampSum / points.length,
      vector: vectorSum.map((value) => value / points.length)
    };
  }
  function lttbSampleContinuousPoints(points, sampleResolution, lttbReference) {
    if (!points || points.length <= 2) return points ? points.slice() : [];
    const first = points[0];
    const last = points[points.length - 1];
    const middle = points.slice(1, -1);
    if (middle.length <= 1) return points.slice();
    const bucketCount = Math.max(1, Math.ceil((last.timestamp - first.timestamp) / sampleResolution));
    if (bucketCount >= middle.length) return points.slice();
    const buckets = Array.from({ length: bucketCount }, () => []);
    middle.forEach((point) => {
      const offset = Math.max(0, point.timestamp - first.timestamp);
      const rawIndex = Math.floor(offset / sampleResolution);
      const bucketIndex = Math.max(0, Math.min(bucketCount - 1, rawIndex));
      buckets[bucketIndex].push(point);
    });
    const sampled = [first];
    let prevSelected = first;
    for (let i = 0; i < buckets.length; i += 1) {
      const currentBucket = buckets[i];
      if (currentBucket.length === 0) continue;
      let nextBucket = null;
      for (let j = i + 1; j < buckets.length; j += 1) {
        if (buckets[j].length > 0) {
          nextBucket = buckets[j];
          break;
        }
      }
      const nextCenter = nextBucket ? getBucketCenter(nextBucket, lttbReference) : { timestamp: last.timestamp, vector: lttbReference(last.data) };
      const prevVector = lttbReference(prevSelected.data);
      let bestPoint = currentBucket[0];
      let bestScore = -1;
      currentBucket.forEach((candidate) => {
        const score = triangleAreaScore(
          prevSelected.timestamp,
          prevVector,
          candidate.timestamp,
          lttbReference(candidate.data),
          nextCenter.timestamp,
          nextCenter.vector
        );
        if (score > bestScore) {
          bestScore = score;
          bestPoint = candidate;
        }
      });
      sampled.push(bestPoint);
      prevSelected = bestPoint;
    }
    sampled.push(last);
    return sampled.sort((a, b) => a.timestamp - b.timestamp);
  }
  function getIntervalRenderData(dataPoints, start, end, sampleResolution, continuityResolution, lttbReference) {
    if (!Array.isArray(dataPoints) || dataPoints.length === 0) return [];
    const inRange = dataPoints.filter((point) => point.timestamp >= start && point.timestamp <= end);
    if (inRange.length === 0) return [];
    let leftAnchor = null;
    let rightAnchor = null;
    for (let i = dataPoints.length - 1; i >= 0; i -= 1) {
      if (dataPoints[i].timestamp < start) {
        leftAnchor = dataPoints[i];
        break;
      }
    }
    for (let i = 0; i < dataPoints.length; i += 1) {
      if (dataPoints[i].timestamp > end) {
        rightAnchor = dataPoints[i];
        break;
      }
    }
    const workingData = [];
    if (leftAnchor) workingData.push(leftAnchor);
    workingData.push(...inRange);
    if (rightAnchor) workingData.push(rightAnchor);
    if (workingData.length <= 1) return workingData;
    const rawSegments = [];
    let current = [workingData[0]];
    for (let i = 1; i < workingData.length; i += 1) {
      const prev = workingData[i - 1];
      const now = workingData[i];
      if (now.timestamp - prev.timestamp <= continuityResolution) {
        current.push(now);
      } else {
        rawSegments.push(current);
        current = [now];
      }
    }
    rawSegments.push(current);
    const renderData = [];
    rawSegments.forEach((segment) => {
      if (segment.length === 1) {
        renderData.push(segment[0]);
        return;
      }
      const sampled = lttbSampleContinuousPoints(segment, sampleResolution, lttbReference);
      renderData.push({
        type: "continuous",
        start: sampled[0],
        end: sampled[sampled.length - 1],
        series: sampled.slice(1, -1)
      });
    });
    return renderData;
  }
  function dedupePoints(points) {
    const seen = /* @__PURE__ */ new Set();
    const result = [];
    points.forEach(([timestamp, value]) => {
      const key = `${timestamp}|${value}`;
      if (seen.has(key)) return;
      seen.add(key);
      result.push([timestamp, value]);
    });
    return result;
  }
  function buildLayeredSeriesData(renderData, valueGetter) {
    const continuousData = [];
    const nonContinuousData = [];
    const symbolPoints = [];
    renderData.forEach((item) => {
      if (item && item.type === "continuous") {
        const segmentPoints = [item.start, ...item.series, item.end];
        segmentPoints.forEach((point) => {
          const value = valueGetter(point.data);
          continuousData.push([point.timestamp, value]);
        });
        continuousData.push([null, null]);
        symbolPoints.push([item.start.timestamp, valueGetter(item.start.data)]);
        symbolPoints.push([item.end.timestamp, valueGetter(item.end.data)]);
        nonContinuousData.push([item.start.timestamp, valueGetter(item.start.data)]);
        nonContinuousData.push([null, null]);
        nonContinuousData.push([item.end.timestamp, valueGetter(item.end.data)]);
        return;
      }
      if (item && Number.isFinite(item.timestamp)) {
        const value = valueGetter(item.data);
        nonContinuousData.push([item.timestamp, value]);
        symbolPoints.push([item.timestamp, value]);
      }
    });
    return {
      continuousData,
      nonContinuousData,
      symbolData: dedupePoints(symbolPoints)
    };
  }
  function initChartOnDom(echarts2, dom) {
    const existing = echarts2.getInstanceByDom(dom);
    if (existing) existing.dispose();
    return echarts2.init(dom);
  }
  function buildTooltipFormatter() {
    return function formatter(params) {
      const validParams = params.filter((p) => Array.isArray(p.value) && Number.isFinite(p.value[1]));
      if (validParams.length === 0) return "";
      const date = new Date(validParams[0].value[0]);
      let result = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}<br/>`;
      const valueMap = /* @__PURE__ */ new Map();
      validParams.forEach((param) => {
        const old = valueMap.get(param.seriesName);
        const now = param.value[1];
        if (!old || now > old.value) {
          valueMap.set(param.seriesName, { color: param.color, value: now });
        }
      });
      const merged = Array.from(valueMap.entries()).map(([name, payload]) => ({ name, ...payload })).sort((a, b) => b.value - a.value);
      merged.forEach((item) => {
        if (item.value > 0) {
          result += `<span style="display:inline-block;margin-right:5px;border-radius:10px;width:10px;height:10px;background-color:${item.color};"></span>`;
          result += `${item.name}: ${item.value}人<br/>`;
        }
      });
      return result;
    };
  }
  MbtistatsDashboard.prototype.renderTrendCharts = function() {
    if (!this.typeHistoryData || this.typeHistoryData.length <= 1) {
      this.trendWindowsDom.style.display = "none";
      return;
    }
    this.trendWindowsDom.style.display = "block";
    Object.values(this.trendWindowRefs).forEach((ref) => {
      if (!ref || !ref.card) return;
      ref.card.style.display = "none";
      const type16Instance = this.echarts.getInstanceByDom(ref.type16Dom);
      if (type16Instance) type16Instance.clear();
      const type4Instance = this.echarts.getInstanceByDom(ref.type4Dom);
      if (type4Instance) type4Instance.clear();
    });
    const allPersonalities = this.mbtiConfig.map((item) => item.type);
    const colorGroups = {
      "分析家": ["INTJ", "INTP", "ENTJ", "ENTP"],
      "外交家": ["INFJ", "INFP", "ENFJ", "ENFP"],
      "守护者": ["ISTJ", "ISFJ", "ESTJ", "ESFJ"],
      "探险家": ["ISTP", "ISFP", "ESTP", "ESFP"]
    };
    const groupColorMap = {
      "分析家": "#9b85c1",
      "外交家": "#70AD47",
      "守护者": "#5293D0",
      "探险家": "#FFB703"
    };
    const groupNames = Object.keys(colorGroups);
    const tooltipFormatter = buildTooltipFormatter();
    const windows = buildTrendWindows(this.typeHistoryData);
    let renderedWindowCount = 0;
    windows.forEach((windowDef) => {
      const windowRef = this.trendWindowRefs[windowDef.key];
      if (!windowRef || !windowRef.card || !windowRef.type16Dom || !windowRef.type4Dom) return;
      const chartWidthPx = windowRef.type16Dom.clientWidth || TREND_CHART_WIDTH_PX;
      const { continuityResolution, sampleResolution } = computeRenderResolutions(
        windowDef.start,
        windowDef.end,
        chartWidthPx
      );
      const renderData = getIntervalRenderData(
        this.typeHistoryData,
        windowDef.start,
        windowDef.end,
        sampleResolution,
        continuityResolution,
        (payload) => allPersonalities.map((type) => {
          const found = payload.find((item) => item.name === type);
          return found ? found.value : 0;
        })
      );
      if (renderData.length <= 1) return;
      windowRef.card.style.display = "block";
      renderedWindowCount += 1;
      const type16Chart = initChartOnDom(this.echarts, windowRef.type16Dom);
      const type4Chart = initChartOnDom(this.echarts, windowRef.type4Dom);
      const type16Series = [];
      allPersonalities.forEach((personality, index) => {
        const color = this.colorMap[personality] || this.defaultColor;
        const getRawValue = (payload) => {
          const found = payload.find((item) => item.name === personality);
          return found ? found.value : 0;
        };
        const getCumulativeValue = (payload) => {
          let total = 0;
          for (let i = 0; i <= index; i += 1) {
            const type = allPersonalities[i];
            const found = payload.find((item) => item.name === type);
            total += found ? found.value : 0;
          }
          return total;
        };
        const layeredArea = buildLayeredSeriesData(renderData, getRawValue);
        const layeredTopLine = buildLayeredSeriesData(renderData, getCumulativeValue);
        const baseZ = 1e3 - index * 10;
        type16Series.push({
          name: personality,
          type: "line",
          stack: "总量-非连续",
          data: layeredArea.nonContinuousData,
          color,
          showSymbol: false,
          smooth: true,
          clip: true,
          z: baseZ,
          lineStyle: { color, width: 0, opacity: 0 },
          areaStyle: { color, opacity: 0.5 }
        });
        type16Series.push({
          name: personality,
          type: "line",
          stack: "总量-连续",
          data: layeredArea.continuousData,
          color,
          showSymbol: false,
          smooth: true,
          clip: true,
          z: baseZ + 1,
          lineStyle: { color, width: 0, opacity: 0 },
          areaStyle: { color, opacity: 0.8 }
        });
        type16Series.push({
          name: personality,
          type: "line",
          data: layeredTopLine.nonContinuousData,
          color,
          showSymbol: false,
          smooth: true,
          clip: true,
          z: baseZ + 2,
          lineStyle: { color: `${color}80`, width: 2 }
        });
        type16Series.push({
          name: personality,
          type: "line",
          data: layeredTopLine.continuousData,
          color,
          showSymbol: false,
          smooth: true,
          clip: true,
          z: baseZ + 3,
          lineStyle: { color, width: 3 }
        });
        type16Series.push({
          name: personality,
          type: "line",
          data: layeredTopLine.symbolData,
          color,
          showSymbol: true,
          symbol: "emptyCircle",
          symbolSize: TREND_POINT_SIZE_PX,
          smooth: true,
          clip: true,
          z: baseZ + 4,
          lineStyle: { width: 0, opacity: 0 },
          itemStyle: { color }
        });
      });
      const type16LegendRows = [
        [
          "INTP",
          "ENTP",
          "INTJ",
          "ENTJ",
          // 分析家
          "INFP",
          "ENFP",
          "INFJ",
          "ENFJ"
          // 外交家
        ],
        [
          "ISTJ",
          "ESTJ",
          "ISFJ",
          "ESFJ",
          // 守护者
          "ISTP",
          "ESTP",
          "ISFP",
          "ESFP"
          // 探险家
        ]
      ];
      const type16Legend = type16LegendRows.map((row, rowIndex) => ({
        type: "plain",
        orient: "horizontal",
        // 两行使用相同左边界，避免“各行单独居中”导致列错位
        left: "11%",
        // 逐行向上偏移，形成稳定 2 行布局
        bottom: rowIndex * 20,
        selectedMode: true,
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 4,
        // 通过固定宽度的 rich 文本单元格，让每个图例项在“格子”内左对齐
        formatter: (name) => `{legendCell|${name}}`,
        textStyle: {
          rich: {
            legendCell: {
              width: 32,
              align: "left",
              lineHeight: 10,
              padding: [0, 0, 0, 0],
              fontSize: 10
            }
          }
        },
        data: row
      }));
      type16Chart.setOption({
        // 显式指定 legend 的调色盘，避免同名多层 series 时回落到默认彩虹色
        color: allPersonalities.map((type) => this.colorMap[type] || this.defaultColor),
        tooltip: { trigger: "axis", axisPointer: { type: "cross" }, formatter: tooltipFormatter },
        legend: type16Legend,
        grid: { left: "6%", right: "6%", bottom: "12%", top: "7%", containLabel: true },
        xAxis: {
          type: "time",
          min: windowDef.start,
          max: windowDef.end,
          boundaryGap: false,
          axisLabel: { fontSize: 11, hideOverlap: true, showMaxLabel: true, showMinLabel: true }
        },
        yAxis: { type: "value", name: "人数", axisLabel: { fontSize: 11 }, splitLine: { show: true, lineStyle: { type: "dashed" } } },
        series: type16Series
      });
      const type4Series = [];
      groupNames.forEach((groupName, index) => {
        const color = groupColorMap[groupName] || this.defaultColor;
        const types = colorGroups[groupName];
        const getGroupValue = (payload) => types.reduce((sum, type) => {
          const item = payload.find((d) => d.name === type);
          return sum + (item ? item.value : 0);
        }, 0);
        const layered = buildLayeredSeriesData(renderData, getGroupValue);
        const z = 200 - index * 10;
        type4Series.push({
          name: groupName,
          type: "line",
          data: layered.nonContinuousData,
          color,
          showSymbol: false,
          smooth: true,
          clip: true,
          z,
          lineStyle: { color: `${color}80`, width: 2 }
        });
        type4Series.push({
          name: groupName,
          type: "line",
          data: layered.continuousData,
          color,
          showSymbol: false,
          smooth: true,
          clip: true,
          z: z + 1,
          lineStyle: { color, width: 3 }
        });
        type4Series.push({
          name: groupName,
          type: "line",
          data: layered.symbolData,
          color,
          showSymbol: true,
          symbol: "emptyCircle",
          symbolSize: TREND_POINT_SIZE_PX,
          smooth: true,
          clip: true,
          z: z + 2,
          lineStyle: { width: 0, opacity: 0 },
          itemStyle: { color }
        });
      });
      type4Chart.setOption({
        // 显式指定图例色，保证与四色曲线颜色一致
        color: groupNames.map((groupName) => groupColorMap[groupName] || this.defaultColor),
        tooltip: { trigger: "axis", axisPointer: { type: "cross" }, formatter: tooltipFormatter },
        legend: { type: "scroll", bottom: 0, data: groupNames, textStyle: { fontSize: 11 }, itemWidth: 12, itemHeight: 12 },
        grid: { left: "6%", right: "6%", bottom: "12%", top: "7%", containLabel: true },
        xAxis: {
          type: "time",
          min: windowDef.start,
          max: windowDef.end,
          boundaryGap: false,
          axisLabel: { fontSize: 11, hideOverlap: true, showMaxLabel: true, showMinLabel: true }
        },
        yAxis: { type: "value", name: "人数", axisLabel: { fontSize: 11 }, splitLine: { show: true, lineStyle: { type: "dashed" } } },
        series: type4Series
      });
    });
    if (renderedWindowCount === 0) {
      this.trendWindowsDom.style.display = "none";
    }
  };

  // src/trait-pies.mjs
  MbtistatsDashboard.prototype.renderTraitPies = function() {
    const initTraitChart = (cfg) => {
      let chart;
      switch (cfg.id) {
        case "chart-ei":
          chart = this.eiChart;
          break;
        case "chart-ns":
          chart = this.nsChart;
          break;
        case "chart-tf":
          chart = this.tfChart;
          break;
        case "chart-jp":
          chart = this.jpChart;
          break;
        default:
          return;
      }
      const trait1 = cfg.traits[0];
      const trait2 = cfg.traits[1];
      const traitX = cfg.traits[2];
      const data1 = { count: this.traitRawData[cfg.rawKey][trait1] || 0 };
      const data2 = { count: this.traitRawData[cfg.rawKey][trait2] || 0 };
      const dataX = { count: this.traitRawData[cfg.rawKey][traitX] || 0 };
      const pieData = [
        {
          value: data1.count,
          name: cfg.labels[0],
          itemStyle: { color: cfg.colors[0] },
          label: { formatter: `${cfg.labels[0]}`, color: "#fff", fontSize: 16, fontWeight: "bold", lineHeight: 20 }
        },
        {
          value: data2.count,
          name: cfg.labels[1],
          itemStyle: { color: cfg.colors[1] },
          label: { formatter: `${cfg.labels[1]}`, color: "#fff", fontSize: 16, fontWeight: "bold", lineHeight: 20 }
        },
        {
          value: dataX.count,
          name: cfg.labels[2],
          itemStyle: { color: cfg.colors[2] },
          label: { formatter: `${cfg.labels[2]}`, color: "#fff", fontSize: 14, fontWeight: "bold", lineHeight: 18 }
        }
      ];
      if (dataX.count === 0) pieData.pop();
      chart.setOption({
        title: { text: cfg.rawKey, left: "center", textStyle: { fontSize: 14, fontWeight: "bold" } },
        textStyle: { fontFamily: "Noto Sans SC, Microsoft YaHei, sans-serif" },
        tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
        series: [
          {
            name: "Distribution",
            type: "pie",
            radius: ["30%", "90%"],
            center: ["50%", "50%"],
            avoidLabelOverlap: true,
            itemStyle: { borderRadius: 4, borderColor: "#fff", borderWidth: 2 },
            label: {
              show: true,
              position: "inside",
              formatter: "{b}",
              fontSize: 16,
              fontWeight: "bold",
              color: "#fff",
              lineHeight: 20,
              align: "center",
              verticalAlign: "middle"
            },
            labelLine: { show: false },
            emphasis: { label: { show: true, fontSize: 18, fontWeight: "bold" } },
            data: pieData
          }
        ]
      });
    };
    this.traitConfig.forEach((cfg) => initTraitChart(cfg));
  };

  // src/scripts.mjs
  function setupCharts(data) {
    const dashboard = new MbtistatsDashboard(data);
    dashboard.setupAll();
  }
  return __toCommonJS(scripts_exports);
})();
window.setupCharts = MbtistatsDashboardBundle.setupCharts;
