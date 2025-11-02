import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportData {
  meta: {
    report_generated_at: string;
    params_used: {
      sellerName: string;
      department: string;
      offeredItem: string;
      days: number;
      limit: number;
      email?: string;
    };
  };
  data: {
    sellerBids?: Array<any>;
    estimatedMissedValue?: any;
    priceBand?: { highest: number; lowest: number; average: number };
    topPerformingStates?: any;
    topSellersByDept?: any;
    categoryListing?: Array<{ category: string; count: number; value?: number }>;
    allDepartments?: Array<{ department: string; total_tenders: string | number }>;
    lowCompetitionBids?: { results: Array<any>; count: number; generated_at: string };
    missedButWinnable: {
      seller: string;
      recentWins: Array<any>;
      marketWins: Array<any>;
      ai: {
        strategy_summary: string;
        likely_wins?: Array<{
          offered_item: string;
          reason: string;
          matching_market_wins: Array<any>;
        }>;
        signals: {
          org_affinity: Array<{ org: string; signal: string }>;
          dept_affinity: Array<{ dept: string; signal: string }>;
          ministry_affinity: Array<{ ministry: string; signal: string }>;
          quantity_ranges: Array<string>;
          price_ranges: Array<string>;
        };
        guidance?: {
          note: string;
          next_steps: Array<string>;
          expansion_areas: Array<string>;
        };
      };
    };
  };
}

interface FilterOptions {
  includeSections: string[];
}

// Modern Corporate Color System (RGB)
const colors = {
  deepBlue: [30, 64, 175] as [number, number, number],
  brightBlue: [59, 130, 246] as [number, number, number],
  lightBlue: [239, 246, 255] as [number, number, number],
  successGreen: [16, 185, 129] as [number, number, number],
  warningOrange: [245, 158, 11] as [number, number, number],
  errorRed: [239, 68, 68] as [number, number, number],
  neutralGray: [107, 114, 128] as [number, number, number],
  darkGray: [31, 41, 55] as [number, number, number],
  mediumGray: [107, 114, 128] as [number, number, number],
  lightGray: [156, 163, 175] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  lightestGray: [249, 250, 251] as [number, number, number],
  borderGray: [229, 231, 235] as [number, number, number],
  purple: [168, 85, 247] as [number, number, number],
  amber: [251, 191, 36] as [number, number, number],
};

const formatCurrency = (amount: number): string => {
  if (amount >= 10000000) {
    return `Rs ${(amount / 10000000).toFixed(2)} Cr`;
  } else if (amount >= 100000) {
    return `Rs ${(amount / 100000).toFixed(2)} L`;
  }
  return `Rs ${amount.toLocaleString('en-IN')}`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Sanitize text to avoid encoding issues and unwanted extra spaces
const clean = (value: any): string => {
  const s = value == null ? '' : String(value);
  return s
    .replace(/[₹]/g, 'Rs ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7E]/g, '')
    .trim();
};

// Helper to draw modern donut chart
const drawModernDonutChart = (
  doc: jsPDF,
  centerX: number,
  centerY: number,
  outerRadius: number,
  innerRadius: number,
  data: Array<{ label: string; value: number; color: [number, number, number] }>
) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = -Math.PI / 2;

  data.forEach((item) => {
    const sliceAngle = (item.value / total) * 2 * Math.PI;
    const steps = Math.ceil((sliceAngle * 180) / Math.PI / 2);
    
    for (let i = 0; i <= steps; i++) {
      const angle1 = currentAngle + (sliceAngle * i) / steps;
      const angle2 = currentAngle + (sliceAngle * (i + 1)) / steps;
      
      const x1Outer = centerX + outerRadius * Math.cos(angle1);
      const y1Outer = centerY + outerRadius * Math.sin(angle1);
      const x2Outer = centerX + outerRadius * Math.cos(angle2);
      const y2Outer = centerY + outerRadius * Math.sin(angle2);
      
      const x1Inner = centerX + innerRadius * Math.cos(angle1);
      const y1Inner = centerY + innerRadius * Math.sin(angle1);
      const x2Inner = centerX + innerRadius * Math.cos(angle2);
      const y2Inner = centerY + innerRadius * Math.sin(angle2);
      
      doc.setFillColor(...item.color);
      doc.triangle(x1Outer, y1Outer, x2Outer, y2Outer, x1Inner, y1Inner, 'F');
      doc.triangle(x2Outer, y2Outer, x2Inner, y2Inner, x1Inner, y1Inner, 'F');
    }
    
    currentAngle += sliceAngle;
  });
  
  doc.setFillColor(255, 255, 255);
  doc.circle(centerX, centerY, innerRadius, 'F');
};

// Helper to draw modern horizontal bar chart
const drawModernBarChart = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  data: Array<{ label: string; value: number; color: [number, number, number]; percentage?: number }>,
  showValues: boolean = true
) => {
  const barHeight = 10;
  const spacing = 6;
  const max = Math.max(...data.map(d => d.value));
  
  data.forEach((item, index) => {
    const barWidth = (item.value / max) * width;
    const currentY = y + index * (barHeight + spacing);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.darkGray);
const maxLabelWidth = 50;
    let labelText = clean(item.label);
    while (doc.getTextWidth(labelText) > maxLabelWidth && labelText.length > 3) {
      labelText = labelText.substring(0, labelText.length - 1);
    }
    if (labelText !== clean(item.label)) labelText += '...';
    doc.text(labelText, x, currentY + 7);
    
    doc.setFillColor(...colors.borderGray);
    doc.roundedRect(x + 55, currentY + 1, width, barHeight - 2, 2, 2, 'F');
    
    doc.setFillColor(...item.color);
    doc.roundedRect(x + 55, currentY + 1, Math.max(barWidth, 2), barHeight - 2, 2, 2, 'F');
    
    const lighterColor = item.color.map(c => Math.min(c + 30, 255)) as [number, number, number];
    doc.setFillColor(...lighterColor);
    doc.roundedRect(x + 55, currentY + 1, Math.max(barWidth, 2), (barHeight - 2) / 2, 2, 2, 'F');
    
    if (showValues) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...item.color);
      const valueText = item.percentage ? `${item.percentage.toFixed(1)}%` : formatCurrency(item.value);
      doc.text(valueText, x + 57 + barWidth, currentY + 7);
    }
  });
};

// Helper to draw modern card container
const drawCard = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  accentColor?: [number, number, number]
) => {
  doc.setFillColor(220, 220, 220);
  doc.roundedRect(x + 1, y + 1, width, height, 3, 3, 'F');
  
  doc.setFillColor(...colors.white);
  doc.roundedRect(x, y, width, height, 3, 3, 'F');
  
  doc.setDrawColor(...colors.borderGray);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, width, height, 3, 3, 'S');
  
  if (accentColor) {
    doc.setFillColor(...accentColor);
    doc.rect(x, y, 2, height, 'F');
  }
};

export const generatePDF = async (
  reportData: ReportData,
  filters: FilterOptions
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const HEADER_H = 15;
  const FOOTER_H = 12;
  const SAFE_TOP = HEADER_H + 3;
  const SAFE_BOTTOM = pageHeight - FOOTER_H - 5;
  let yPosition = SAFE_TOP;

  const wins = reportData.data.missedButWinnable?.recentWins || [];
  const marketWins = reportData.data.missedButWinnable?.marketWins || [];
  const totalBids = wins.length + marketWins.length;
  const successCount = wins.length;
  const losses = marketWins.length;
  const winRate = totalBids > 0 ? ((successCount / totalBids) * 100) : 0;
  
  const totalValue = wins.reduce((sum, win) => sum + (win.total_price || 0), 0);
  const avgValue = successCount > 0 ? Math.round(totalValue / successCount) : 0;
  const avgBidsPerDay = totalBids / reportData.meta.params_used.days;

const addNewPage = () => {
    doc.addPage();
    yPosition = SAFE_TOP;
    addPageHeader();
    addPageFooter();
  };

  const addPageHeader = () => {
    doc.setFillColor(...colors.lightestGray);
    doc.rect(0, 0, pageWidth, 15, 'F');
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.deepBlue);
    doc.text('Government Tender Analysis', pageWidth / 2, 8, { align: 'center' });
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.mediumGray);
    doc.text(formatDate(reportData.meta.report_generated_at), pageWidth - margin, 8, { align: 'right' });
    
    doc.setDrawColor(...colors.borderGray);
    doc.setLineWidth(0.2);
    doc.line(0, 15, pageWidth, 15);
  };

  const addPageFooter = () => {
    const pageNum = doc.getCurrentPageInfo().pageNumber;
    
    doc.setFillColor(...colors.deepBlue);
    doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.white);
    doc.text(reportData.meta.params_used.sellerName, margin, pageHeight - 5);
    doc.text(`Page ${pageNum}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
    doc.text('Confidential', pageWidth - margin, pageHeight - 5, { align: 'right' });
  };

const checkPageBreak = (requiredSpace: number): boolean => {
    if (yPosition + requiredSpace > SAFE_BOTTOM) {
      addNewPage();
      return true;
    }
    return false;
  };

  const addSectionHeader = (
    title: string,
    color: [number, number, number] = colors.deepBlue
  ) => {
    checkPageBreak(20);
    
    doc.setFillColor(...colors.white);
    doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 10, 2, 2, 'F');
    
    doc.setFillColor(...color);
    doc.rect(margin, yPosition, 2, 10, 'F');
    
    doc.setDrawColor(...colors.borderGray);
    doc.setLineWidth(0.2);
    doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 10, 2, 2, 'S');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.darkGray);
    doc.text(title, margin + 6, yPosition + 7);
    
    yPosition += 13;
  };

  // ============ COVER PAGE ============
  
  doc.setFillColor(...colors.deepBlue);
  doc.rect(0, 0, pageWidth, 80, 'F');
  
  doc.setFillColor(20, 50, 130);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setFillColor(40, 70, 150);
  doc.circle(pageWidth + 20, -10, 60, 'F');
  doc.circle(-30, 70, 50, 'F');
  
  doc.setDrawColor(...colors.brightBlue);
  doc.setLineWidth(2);
  doc.line(0, 3, pageWidth, 3);
  
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.white);
  doc.text('GOVERNMENT TENDER ANALYSIS', pageWidth / 2, 25, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.lightBlue);
  doc.text('Comprehensive Performance Report', pageWidth / 2, 33, { align: 'center' });
  
  yPosition = 50;
  const companyBoxWidth = pageWidth - 50;
  doc.setFillColor(25, 55, 140);
  doc.roundedRect((pageWidth - companyBoxWidth) / 2, yPosition, companyBoxWidth, 16, 3, 3, 'F');
  doc.setDrawColor(...colors.brightBlue);
  doc.setLineWidth(0.5);
  doc.roundedRect((pageWidth - companyBoxWidth) / 2, yPosition, companyBoxWidth, 16, 3, 3, 'S');
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.brightBlue);
  doc.text(reportData.meta.params_used.sellerName, pageWidth / 2, yPosition + 11, { align: 'center' });
  
  yPosition = 85;
  drawCard(doc, margin, yPosition, pageWidth - 2 * margin, 38);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.mediumGray);
  
  const detailsY = yPosition + 7;
  doc.text('Report Generated:', margin + 8, detailsY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.darkGray);
  doc.text(formatDate(reportData.meta.report_generated_at), margin + 50, detailsY);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.mediumGray);
  doc.text('Analysis Period:', margin + 8, detailsY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.darkGray);
  doc.text(`${reportData.meta.params_used.days} days`, margin + 50, detailsY + 6);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.mediumGray);
  doc.text('Department:', margin + 8, detailsY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.darkGray);
const deptText = clean(reportData.meta.params_used.department);
  const truncDept = deptText.length > 50 ? deptText.substring(0, 50) + '...' : deptText;
  doc.text(truncDept, margin + 50, detailsY + 12);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.mediumGray);
  doc.text('Offered Items:', margin + 8, detailsY + 18);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.darkGray);
const itemsText = clean(reportData.meta.params_used.offeredItem || 'Various items');
  const itemLines = doc.splitTextToSize(itemsText, pageWidth - 2 * margin - 60);
  doc.text(itemLines.slice(0, 2), margin + 50, detailsY + 18);
  
// ============ PERFORMANCE OVERVIEW ============
  addNewPage();
  addSectionHeader('Performance Overview', colors.deepBlue);
  
  const kpiCardWidth = (pageWidth - 2 * margin - 10) / 2;
  const kpiCardHeight = 24;
  
  // Win Rate Card
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(margin, yPosition, kpiCardWidth, kpiCardHeight, 3, 3, 'F');
  drawCard(doc, margin, yPosition, kpiCardWidth, kpiCardHeight, colors.successGreen);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.successGreen);
  doc.text(`${winRate.toFixed(1)}%`, margin + kpiCardWidth / 2, yPosition + 13, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.mediumGray);
  doc.text('Win Rate', margin + kpiCardWidth / 2, yPosition + 19, { align: 'center' });
  
  // Total Bids Card
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(margin + kpiCardWidth + 10, yPosition, kpiCardWidth, kpiCardHeight, 3, 3, 'F');
  drawCard(doc, margin + kpiCardWidth + 10, yPosition, kpiCardWidth, kpiCardHeight, colors.brightBlue);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.brightBlue);
  doc.text(totalBids.toString(), margin + kpiCardWidth + 10 + kpiCardWidth / 2, yPosition + 13, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.mediumGray);
  doc.text('Total Bids', margin + kpiCardWidth + 10 + kpiCardWidth / 2, yPosition + 19, { align: 'center' });
  
  yPosition += kpiCardHeight + 6;
  
  // Success Count Card
  doc.setFillColor(243, 232, 255);
  doc.roundedRect(margin, yPosition, kpiCardWidth, kpiCardHeight, 3, 3, 'F');
  drawCard(doc, margin, yPosition, kpiCardWidth, kpiCardHeight, colors.purple);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.purple);
  doc.text(successCount.toString(), margin + kpiCardWidth / 2, yPosition + 13, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.mediumGray);
  doc.text('Successful Wins', margin + kpiCardWidth / 2, yPosition + 19, { align: 'center' });
  
  // Total Value Card
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(margin + kpiCardWidth + 10, yPosition, kpiCardWidth, kpiCardHeight, 3, 3, 'F');
  drawCard(doc, margin + kpiCardWidth + 10, yPosition, kpiCardWidth, kpiCardHeight, colors.warningOrange);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.warningOrange);
  doc.text(formatCurrency(totalValue), margin + kpiCardWidth + 10 + kpiCardWidth / 2, yPosition + 13, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.mediumGray);
  doc.text('Total Value', margin + kpiCardWidth + 10 + kpiCardWidth / 2, yPosition + 19, { align: 'center' });
  
  yPosition += kpiCardHeight + 8;
  
  // Win/Loss Distribution Chart
  const chartCardHeight = 55;
  drawCard(doc, margin, yPosition, pageWidth - 2 * margin, chartCardHeight);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.darkGray);
  doc.text('Win/Loss Distribution', margin + 8, yPosition + 7);
  
  const donutCenterX = margin + 30;
  const donutCenterY = yPosition + 32;
  const donutData = [
    { label: 'Wins', value: successCount, color: colors.successGreen },
    { label: 'Losses', value: losses, color: colors.errorRed }
  ];
  drawModernDonutChart(doc, donutCenterX, donutCenterY, 18, 10, donutData);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.darkGray);
  doc.text(`${winRate.toFixed(1)}%`, donutCenterX, donutCenterY + 2, { align: 'center' });
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.mediumGray);
  doc.text('Win Rate', donutCenterX, donutCenterY + 6, { align: 'center' });
  
  const legendX = margin + 60;
  let legendY = yPosition + 20;
  
  doc.setFillColor(...colors.successGreen);
  doc.roundedRect(legendX, legendY, 3, 3, 1, 1, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.darkGray);
  doc.text(`Wins: ${successCount} (${winRate.toFixed(1)}%)`, legendX + 6, legendY + 2.5);
  
  legendY += 6;
  doc.setFillColor(...colors.errorRed);
  doc.roundedRect(legendX, legendY, 3, 3, 1, 1, 'F');
  doc.text(`Losses: ${losses} (${(100 - winRate).toFixed(1)}%)`, legendX + 6, legendY + 2.5);
  
  legendY += 8;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.mediumGray);
  doc.text('Avg Order Value:', legendX, legendY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatCurrency(avgValue), legendX + 30, legendY);
  
  legendY += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Avg Bids/Day:', legendX, legendY);
  doc.setFont('helvetica', 'normal');
  doc.text(avgBidsPerDay.toFixed(2), legendX + 30, legendY);
  
  // ============ DEPARTMENT-WISE SUMMARY ============
  addNewPage();
  
  addSectionHeader('Summary of Bids Participated - Department-wise', colors.brightBlue);
  
const allDepts = (reportData.data.allDepartments || [])
      .filter((d: any) => clean(d.department) && clean(d.department).toLowerCase() !== 'na');
  if (allDepts.length > 0) {
    const deptData = allDepts.slice(0, 15).map((d: any) => ({
      label: clean(d.department),
      value: Number(d.total_tenders),
      percentage: 0,
      color: colors.brightBlue,
    }));
    const chartHeight = Math.min(deptData.length * 16 + 10, 120);
    checkPageBreak(chartHeight + 20);
    drawCard(doc, margin, yPosition, pageWidth - 2 * margin, chartHeight);
    drawModernBarChart(doc, margin + 8, yPosition + 6, pageWidth - 2 * margin - 75, deptData, false);
    yPosition += chartHeight + 8;
  }
  
  // ============ OVERALL MARKET OVERVIEW ============
  checkPageBreak(65);
  addSectionHeader('Overall Market Overview', colors.purple);
  
  drawCard(doc, margin, yPosition, pageWidth - 2 * margin, 55);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.purple);
  doc.text('Market Analysis Summary', margin + 8, yPosition + 7);
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.darkGray);
  const aiSummary = reportData.data.missedButWinnable?.ai?.strategy_summary || 'No market analysis available.';
  const summaryLines = doc.splitTextToSize(aiSummary, pageWidth - 2 * margin - 20);
  doc.text(summaryLines.slice(0, 8), margin + 8, yPosition + 13);
  
  yPosition += 58;
  
  // ============ TOP PERFORMER DEPARTMENTS ============
  checkPageBreak(70);
  addSectionHeader('Top Performer Departments', colors.successGreen);
  
if (reportData.data.allDepartments && reportData.data.allDepartments.length > 0) {
    const topDepts = reportData.data.allDepartments.slice(0, 12).map((dept) => ({
      label: clean(dept.department),
      value: Number(dept.total_tenders),
      percentage: 0,
      color: colors.successGreen
    }));
    const chartHeight = Math.min(topDepts.length * 16 + 10, 110);
    checkPageBreak(chartHeight + 20);
    drawCard(doc, margin, yPosition, pageWidth - 2 * margin, chartHeight);
    drawModernBarChart(doc, margin + 8, yPosition + 6, pageWidth - 2 * margin - 75, topDepts, false);
    yPosition += chartHeight + 8;
  }
  
  // ============ MISSED BUT WINNABLE TENDERS ============
  addNewPage();
  
  addSectionHeader('Missed-but-Winnable Tenders', colors.warningOrange);
  
  if (marketWins.length > 0) {
    drawCard(doc, margin, yPosition, pageWidth - 2 * margin, 16);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.mediumGray);
    doc.text('Total Missed:', margin + 8, yPosition + 7);
    doc.setTextColor(...colors.warningOrange);
    doc.text(marketWins.length.toString(), margin + 35, yPosition + 7);
    
    doc.setTextColor(...colors.mediumGray);
    doc.text('Potential Value:', margin + 60, yPosition + 7);
    const missedValue = marketWins.reduce((sum, w) => sum + (w.total_price || 0), 0);
    doc.setTextColor(...colors.warningOrange);
    doc.text(formatCurrency(missedValue), margin + 93, yPosition + 7);
    
    yPosition += 19;
    
let missedTableData = marketWins.slice(0, 10).map((win, index) => [
      (index + 1).toString(),
      clean((win.bid_number || 'N/A').substring(0, 18)),
      clean((win.org || 'N/A').substring(0, 28)),
      clean((win.dept || 'N/A').substring(0, 22)),
      win.quantity?.toString() || '0',
      formatCurrency(win.total_price || 0),
      formatDate(win.ended_at || win.created_at)
    ]);
    missedTableData = missedTableData.map(row => row.map(cell => typeof cell === 'string' ? clean(cell) : cell));
    
    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Bid Number', 'Organization', 'Department', 'Qty', 'Value', 'Date']],
      body: missedTableData,
      theme: 'plain',
      headStyles: { 
        fillColor: colors.warningOrange,
        textColor: colors.white,
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 2.5
      },
      bodyStyles: { 
        fontSize: 6.5,
        cellPadding: 2
      },
      alternateRowStyles: { 
        fillColor: [254, 243, 199]
      },
      columnStyles: {
        0: { cellWidth: 7, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 30, fontSize: 6 },
        2: { cellWidth: 45 },
        3: { cellWidth: 38 },
        4: { cellWidth: 10, halign: 'right' },
        5: { cellWidth: 20, halign: 'right', textColor: colors.warningOrange, fontStyle: 'bold' },
        6: { cellWidth: 19, halign: 'center', fontSize: 6.5 }
      },
      margin: { left: margin, right: margin },
      didDrawPage: (data) => {
        addPageHeader();
        addPageFooter();
      }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 8;
  }
  
  // ============ BUYER / DEPARTMENT INSIGHTS ============
  checkPageBreak(70);
  addSectionHeader('Buyer / Department Insights', colors.deepBlue);
  
  const orgAffinity = reportData.data.missedButWinnable?.ai?.signals?.org_affinity || [];
  if (orgAffinity.length > 0) {
    const orgData = orgAffinity.slice(0, 10).map((org) => {
      const winCount = wins.filter(w => w.org === org.org).length;
      const percentage = totalBids > 0 ? (winCount / totalBids) * 100 : 0;
      return {
        label: org.org,
        value: winCount,
        percentage: percentage,
        color: percentage > 40 ? colors.successGreen : percentage > 20 ? colors.brightBlue : colors.warningOrange
      };
    });
    
const chartHeight = Math.min(orgData.length * 16 + 10, 85);
    checkPageBreak(chartHeight + 20);
    drawCard(doc, margin, yPosition, pageWidth - 2 * margin, chartHeight);
    drawModernBarChart(doc, margin + 8, yPosition + 6, pageWidth - 2 * margin - 75, orgData, true);
    yPosition += chartHeight + 8;
  }
  
  // ============ RIVALRY SCORECARD ============
  checkPageBreak(70);
  addSectionHeader('Rivalry Scorecard - Top Sellers', colors.errorRed);
  
  const topSellers = reportData.data.topSellersByDept?.results || [];
  if (topSellers.length > 0) {
    const rivalryData = topSellers.slice(0, 10).map((seller: any) => ({
      label: seller.seller_name,
      value: seller.participation_count,
      percentage: 0,
      color: colors.errorRed
    }));
    
const chartHeight = Math.min(rivalryData.length * 16 + 10, 85);
    checkPageBreak(chartHeight + 20);
    drawCard(doc, margin, yPosition, pageWidth - 2 * margin, chartHeight);
    drawModernBarChart(doc, margin + 8, yPosition + 6, pageWidth - 2 * margin - 75, rivalryData, false);
    yPosition += chartHeight + 8;
  }
  
  // ============ LOW COMPETITION OPPORTUNITIES ============
  addNewPage();
  
  addSectionHeader('Single-Bidder / Low-Competition Opportunities', colors.amber);
  
  const opportunities = reportData.data.lowCompetitionBids?.results || [];
  if (opportunities.length > 0) {
    drawCard(doc, margin, yPosition, pageWidth - 2 * margin, 16);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.mediumGray);
    doc.text('Total Opportunities:', margin + 8, yPosition + 7);
    doc.setTextColor(...colors.amber);
    doc.text(opportunities.length.toString(), margin + 48, yPosition + 7);
    
    doc.setTextColor(...colors.mediumGray);
    doc.text('Single Competitor:', margin + 80, yPosition + 7);
    doc.setTextColor(...colors.successGreen);
    const singleComp = opportunities.filter(o => o.seller_count === '1').length;
    doc.text(singleComp.toString(), margin + 120, yPosition + 7);
    
    yPosition += 19;
    
let oppTableData = opportunities.slice(0, 12).map((opp, index) => {
      const org = clean((opp.organisation || 'N/A').substring(0, 30));
      const bidNum = clean((opp.bid_number || 'N/A').substring(0, 20));
      const endDate = opp.bid_end_ts ? formatDate(opp.bid_end_ts) : 'N/A';
      const competitors = opp.seller_count || '0';
      const urgency = opp.bid_end_ts ? (new Date(opp.bid_end_ts) < new Date() ? 'Closed' : 'Open') : 'Unknown';
      
      return [
        (index + 1).toString(),
        bidNum,
        org,
        opp.quantity?.toString() || '0',
        competitors,
        endDate,
        urgency
      ];
    });
    oppTableData = oppTableData.map(row => row.map(cell => typeof cell === 'string' ? clean(cell) : cell));
    
    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Bid Number', 'Organization', 'Qty', 'Rivals', 'End Date', 'Status']],
      body: oppTableData,
      theme: 'plain',
      headStyles: { 
        fillColor: colors.amber,
        textColor: colors.white,
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 2.5
      },
      bodyStyles: { 
        fontSize: 6.5,
        cellPadding: 2
      },
      alternateRowStyles: { 
        fillColor: [254, 243, 199]
      },
      columnStyles: {
        0: { cellWidth: 7, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 35, fontSize: 6 },
        2: { cellWidth: 52 },
        3: { cellWidth: 11, halign: 'right' },
        4: { cellWidth: 13, halign: 'center', textColor: colors.successGreen, fontStyle: 'bold' },
        5: { cellWidth: 20, halign: 'center', fontSize: 6.5 },
        6: { cellWidth: 17, halign: 'center', fontSize: 6.5 }
      },
      margin: { left: margin, right: margin },
      didDrawPage: (data) => {
        addPageHeader();
        addPageFooter();
      }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 8;
  }
  
  // ============ TOP PERFORMING STATES ============
  checkPageBreak(70);
  addSectionHeader('Top Performing States / Geographies', colors.successGreen);
  
  if (reportData.data.topPerformingStates?.results) {
    const statesData = reportData.data.topPerformingStates.results.slice(0, 15).map((state: any) => ({
      label: state.state_name,
      value: Number(state.total_tenders),
      percentage: 0,
      color: colors.successGreen
    }));
    
if (statesData.length > 0) {
      const chartHeight = Math.min(statesData.length * 16 + 10, 120);
      checkPageBreak(chartHeight + 20);
      drawCard(doc, margin, yPosition, pageWidth - 2 * margin, chartHeight);
      drawModernBarChart(doc, margin + 8, yPosition + 6, pageWidth - 2 * margin - 75, statesData, false);
      yPosition += chartHeight + 8;
    }
  }
  
  // ============ CATEGORY DISTRIBUTION ============
  if (filters.includeSections.includes('categoryAnalysis')) {
    addNewPage();
    
    addSectionHeader('Category Distribution Analysis', colors.purple);
    
    const categories = reportData.data.categoryListing || [];
    if (categories.length > 0) {
      const topCategories = categories.slice(0, 12);
      const totalCount = topCategories.reduce((sum, cat) => sum + cat.count, 0);
      
      const categoryData = topCategories.map((cat) => ({
        label: cat.category,
        value: cat.count,
        percentage: (cat.count / totalCount) * 100,
        color: colors.brightBlue
      }));
      
const chartHeight = Math.min(categoryData.length * 16 + 10, 100);
      checkPageBreak(chartHeight + 20);
      drawCard(doc, margin, yPosition, pageWidth - 2 * margin, chartHeight);
      drawModernBarChart(doc, margin + 8, yPosition + 6, pageWidth - 2 * margin - 75, categoryData, true);
      yPosition += chartHeight + 8;
    }
  }
  
  // ============ RECENT SUCCESSFUL BIDS ============
  if (filters.includeSections.includes('bidsSummary') && wins.length > 0) {
    checkPageBreak(80);
    addSectionHeader('Recent Successful Bids - Detailed View', colors.successGreen);
    
    drawCard(doc, margin, yPosition, pageWidth - 2 * margin, 16);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.mediumGray);
    doc.text('Total Wins:', margin + 8, yPosition + 7);
    doc.setTextColor(...colors.successGreen);
    doc.text(successCount.toString(), margin + 30, yPosition + 7);
    
    doc.setTextColor(...colors.mediumGray);
    doc.text('Total Value:', margin + 60, yPosition + 7);
    doc.setTextColor(...colors.successGreen);
    doc.text(formatCurrency(totalValue), margin + 88, yPosition + 7);
    
    doc.setTextColor(...colors.mediumGray);
    doc.text('Average:', margin + 130, yPosition + 7);
    doc.setTextColor(...colors.successGreen);
    doc.text(formatCurrency(avgValue), margin + 151, yPosition + 7);
    
    yPosition += 19;
    
let winsTableData = wins.slice(0, 10).map((win, index) => [
      (index + 1).toString(),
      clean((win.bid_number || 'N/A').substring(0, 18)),
      clean((win.org || 'N/A').substring(0, 28)),
      clean((win.dept || 'N/A').substring(0, 22)),
      win.quantity?.toString() || '0',
      formatCurrency(win.total_price || 0),
      formatDate(win.ended_at || win.created_at)
    ]);
    winsTableData = winsTableData.map(row => row.map(cell => typeof cell === 'string' ? clean(cell) : cell));
    
    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Bid Number', 'Organization', 'Department', 'Qty', 'Value', 'Date']],
      body: winsTableData,
      theme: 'plain',
      headStyles: { 
        fillColor: colors.deepBlue,
        textColor: colors.white,
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 2.5
      },
      bodyStyles: { 
        fontSize: 6.5,
        cellPadding: 2
      },
      alternateRowStyles: { 
        fillColor: colors.lightBlue
      },
      columnStyles: {
        0: { cellWidth: 7, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 30, fontSize: 6 },
        2: { cellWidth: 45 },
        3: { cellWidth: 38 },
        4: { cellWidth: 10, halign: 'right' },
        5: { cellWidth: 20, halign: 'right', textColor: colors.successGreen, fontStyle: 'bold' },
        6: { cellWidth: 19, halign: 'center', fontSize: 6.5 }
      },
      margin: { left: margin, right: margin },
      didDrawPage: (data) => {
        addPageHeader();
        addPageFooter();
      }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 8;
  }
  
  // ============ STRATEGIC RECOMMENDATIONS ============
  if (reportData.data.missedButWinnable?.ai?.guidance?.next_steps) {
    checkPageBreak(80);
    addSectionHeader('Strategic Recommendations', colors.warningOrange);
    
    const recommendations = reportData.data.missedButWinnable.ai.guidance.next_steps;
    const cardWidth = (pageWidth - 2 * margin - 10) / 2;
    const cardHeight = 40;
    let cardCount = 0;
    
    recommendations.slice(0, 6).forEach((rec, index) => {
      if (cardCount % 2 === 0 && cardCount > 0) {
        yPosition += cardHeight + 6;
        checkPageBreak(cardHeight + 8);
      }
      
      const cardX = margin + (cardCount % 2) * (cardWidth + 10);
      const cardY = yPosition;
      
      const bgColors = [colors.lightBlue, [240, 253, 244], [254, 243, 199]];
      const accentColors = [colors.brightBlue, colors.successGreen, colors.warningOrange];
      const bgColorIndex = index % 3;
      
      doc.setFillColor(...bgColors[bgColorIndex] as [number, number, number]);
      doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 3, 3, 'F');
      
      doc.setFillColor(...accentColors[bgColorIndex]);
      doc.rect(cardX, cardY, 2, cardHeight, 'F');
      
      doc.setDrawColor(...colors.borderGray);
      doc.setLineWidth(0.2);
      doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 3, 3, 'S');
      
      doc.setFillColor(...accentColors[bgColorIndex]);
      doc.circle(cardX + 10, cardY + 8, 4, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.white);
      doc.text((index + 1).toString(), cardX + 10, cardY + 10, { align: 'center' });
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.darkGray);
      const title = `Action ${index + 1}`;
      doc.text(title, cardX + 17, cardY + 8);
      
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.mediumGray);
      const descLines = doc.splitTextToSize(rec, cardWidth - 18);
      doc.text(descLines.slice(0, 4), cardX + 8, cardY + 16);
      
      cardCount++;
    });
    
    yPosition += cardHeight + 8;
  }
  
  // ============ DISCLAIMER ============
  checkPageBreak(50);
  
  const disclaimerHeight = 42;
  doc.setFillColor(254, 242, 242);
  doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, disclaimerHeight, 3, 3, 'F');
  
  doc.setDrawColor(...colors.errorRed);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, disclaimerHeight, 3, 3, 'S');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.errorRed);
  doc.text('Important Disclaimer', margin + 8, yPosition + 8);
  
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.darkGray);
  const disclaimerText = 'This report is generated based on available public data and AI analysis. While we strive for accuracy, we cannot guarantee the completeness or correctness of all information. Bid decisions should be made based on thorough due diligence and official tender documents. Past performance does not guarantee future results. This analysis is for informational purposes only.';
  const disclaimerLines = doc.splitTextToSize(disclaimerText, pageWidth - 2 * margin - 18);
  doc.text(disclaimerLines, margin + 8, yPosition + 15);
  
  yPosition += disclaimerHeight + 6;
  
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.mediumGray);
  doc.text('© 2025 Government Tender Analysis Platform. All rights reserved.', pageWidth / 2, yPosition, { align: 'center' });
  doc.text('For support: support@tenderanalysis.com', pageWidth / 2, yPosition + 4, { align: 'center' });

  return doc;
};
