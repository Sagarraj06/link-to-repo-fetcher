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

// Modern Corporate Color System (HSL converted to RGB)
const colors = {
  // Primary Colors
  deepBlue: [30, 64, 175] as [number, number, number],      // #1e40af
  brightBlue: [59, 130, 246] as [number, number, number],   // #3b82f6
  lightBlue: [239, 246, 255] as [number, number, number],   // #eff6ff
  
  // Performance Colors
  successGreen: [16, 185, 129] as [number, number, number], // #10b981
  warningOrange: [245, 158, 11] as [number, number, number],// #f59e0b
  errorRed: [239, 68, 68] as [number, number, number],      // #ef4444
  neutralGray: [107, 114, 128] as [number, number, number], // #6b7280
  
  // Text Colors
  darkGray: [31, 41, 55] as [number, number, number],       // #1f2937
  mediumGray: [107, 114, 128] as [number, number, number],  // #6b7280
  lightGray: [156, 163, 175] as [number, number, number],   // #9ca3af
  
  // Background Colors
  white: [255, 255, 255] as [number, number, number],
  lightestGray: [249, 250, 251] as [number, number, number],// #f9fafb
  borderGray: [229, 231, 235] as [number, number, number],  // #e5e7eb
  
  // Accent Colors
  purple: [168, 85, 247] as [number, number, number],       // #a855f7
  amber: [251, 191, 36] as [number, number, number],        // #fbbf24
};

const formatCurrency = (amount: number): string => {
  if (amount >= 10000000) { // 1 Crore or more
    return `₹ ${(amount / 10000000).toFixed(2)} Cr`;
  } else if (amount >= 100000) { // 1 Lakh or more
    return `₹ ${(amount / 100000).toFixed(2)} L`;
  }
  return `₹ ${amount.toLocaleString('en-IN')}`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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
  let currentAngle = -Math.PI / 2; // Start from top

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
  
  // Draw white center circle
  doc.setFillColor(255, 255, 255);
  doc.circle(centerX, centerY, innerRadius, 'F');
};

// Helper to draw modern horizontal bar chart with gradient effect
const drawModernBarChart = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  data: Array<{ label: string; value: number; color: [number, number, number]; percentage?: number }>,
  showValues: boolean = true
) => {
  const barHeight = 12;
  const spacing = 8;
  const max = Math.max(...data.map(d => d.value));
  
  data.forEach((item, index) => {
    const barWidth = (item.value / max) * width;
    const currentY = y + index * (barHeight + spacing);
    
    // Draw label (truncated if needed)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.darkGray);
    const maxLabelWidth = 55;
    let labelText = item.label;
    while (doc.getTextWidth(labelText) > maxLabelWidth && labelText.length > 3) {
      labelText = labelText.substring(0, labelText.length - 1);
    }
    if (labelText !== item.label) labelText += '...';
    doc.text(labelText, x, currentY + 8);
    
    // Draw background track
    doc.setFillColor(...colors.borderGray);
    doc.roundedRect(x + 60, currentY + 2, width, barHeight - 4, 3, 3, 'F');
    
    // Draw gradient bar (simulated with darker base and lighter overlay)
    doc.setFillColor(...item.color);
    doc.roundedRect(x + 60, currentY + 2, Math.max(barWidth, 2), barHeight - 4, 3, 3, 'F');
    
    // Add lighter gradient overlay on top half of bar for depth
    const lighterColor = item.color.map(c => Math.min(c + 30, 255)) as [number, number, number];
    doc.setFillColor(...lighterColor);
    doc.roundedRect(x + 60, currentY + 2, Math.max(barWidth, 2), (barHeight - 4) / 2, 3, 3, 'F');
    
    // Draw value
    if (showValues) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...item.color);
      const valueText = item.percentage ? `${item.percentage.toFixed(1)}%` : formatCurrency(item.value);
      doc.text(valueText, x + 62 + barWidth, currentY + 8);
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
  // Shadow effect (using light gray)
  doc.setFillColor(220, 220, 220);
  doc.roundedRect(x + 1, y + 2, width, height, 4, 4, 'F');
  
  // Card background
  doc.setFillColor(...colors.white);
  doc.roundedRect(x, y, width, height, 4, 4, 'F');
  
  // Border
  doc.setDrawColor(...colors.borderGray);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, width, height, 4, 4, 'S');
  
  // Accent bar if provided
  if (accentColor) {
    doc.setFillColor(...accentColor);
    doc.rect(x, y, 3, height, 'F');
    doc.roundedRect(x, y, 3, 4, 4, 4, 'F');
    doc.roundedRect(x, y + height - 4, 3, 4, 4, 4, 'F');
  }
};

export const generatePDF = async (
  reportData: ReportData,
  filters: FilterOptions
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;
  const margin = 20; // Increased margin for better spacing

  // Calculate performance metrics
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
    yPosition = 20;
    addPageHeader();
    addPageFooter();
  };

  const addPageHeader = () => {
    // Header zone with border
    doc.setFillColor(...colors.lightestGray);
    doc.rect(0, 0, pageWidth, 20, 'F');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.deepBlue);
    doc.text('Government Tender Analysis Report', pageWidth / 2, 10, { align: 'center' });
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.mediumGray);
    doc.text(formatDate(reportData.meta.report_generated_at), pageWidth - margin, 10, { align: 'right' });
    
    // Bottom border
    doc.setDrawColor(...colors.borderGray);
    doc.setLineWidth(0.3);
    doc.line(0, 20, pageWidth, 20);
  };

  const addPageFooter = () => {
    const pageNum = doc.getCurrentPageInfo().pageNumber;
    
    // Dark blue footer strip
    doc.setFillColor(...colors.deepBlue);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.white);
    doc.text(reportData.meta.params_used.sellerName, margin, pageHeight - 7);
    doc.text(`Page ${pageNum}`, pageWidth / 2, pageHeight - 7, { align: 'center' });
    doc.text('Confidential', pageWidth - margin, pageHeight - 7, { align: 'right' });
  };

  const checkPageBreak = (requiredSpace: number): boolean => {
    if (yPosition + requiredSpace > pageHeight - 25) {
      addNewPage();
      return true;
    }
    return false;
  };

  const addSectionHeader = (
    title: string,
    icon: string = '',
    color: [number, number, number] = colors.deepBlue
  ) => {
    checkPageBreak(25);
    
    // Section header card
    doc.setFillColor(...colors.white);
    doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 14, 3, 3, 'F');
    
    // Accent bar
    doc.setFillColor(...color);
    doc.rect(margin, yPosition, 3, 14, 'F');
    
    // Border
    doc.setDrawColor(...colors.borderGray);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 14, 3, 3, 'S');
    
    // Icon (if provided)
    if (icon) {
      doc.setFontSize(12);
      doc.text(icon, margin + 7, yPosition + 9);
    }
    
    // Title
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.darkGray);
    doc.text(title, margin + (icon ? 15 : 8), yPosition + 9);
    
    yPosition += 18;
    doc.setTextColor(...colors.darkGray);
  };

  // ============ PAGE 1: COVER + EXECUTIVE SUMMARY ============
  
  // Modern cover design with gradient effect
  doc.setFillColor(...colors.deepBlue);
  doc.rect(0, 0, pageWidth, 80, 'F');
  
  // Add gradient effect (darker to lighter)
  doc.setFillColor(30, 58, 138); // Darker blue overlay
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Decorative circles (background elements)
  doc.setFillColor(30, 58, 138); // Darker blue
  doc.circle(pageWidth + 10, 10, 50, 'F');
  doc.circle(-20, 60, 40, 'F');
  
  // Top accent line with gradient simulation
  doc.setDrawColor(...colors.brightBlue);
  doc.setLineWidth(3);
  doc.line(0, 5, pageWidth, 5);
  doc.setLineWidth(1);
  doc.line(0, 7, pageWidth, 7);
  
  // Report type
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.lightBlue);
  doc.text('GOVERNMENT TENDER PERFORMANCE', pageWidth / 2, 18, { align: 'center' });
  
  // Main title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.white);
  doc.text('COMPREHENSIVE ANALYSIS REPORT', pageWidth / 2, 28, { align: 'center' });
  
  // Company name box
  yPosition = 40;
  const companyBoxWidth = pageWidth - 60;
  doc.setFillColor(30, 58, 138);
  doc.roundedRect((pageWidth - companyBoxWidth) / 2, yPosition, companyBoxWidth, 18, 3, 3, 'F');
  doc.setDrawColor(...colors.brightBlue);
  doc.setLineWidth(0.5);
  doc.roundedRect((pageWidth - companyBoxWidth) / 2, yPosition, companyBoxWidth, 18, 3, 3, 'S');
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.brightBlue);
  doc.text(reportData.meta.params_used.sellerName, pageWidth / 2, yPosition + 12, { align: 'center' });
  
  // Report details card
  yPosition = 90;
  drawCard(doc, margin, yPosition, pageWidth - 2 * margin, 45);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.mediumGray);
  
  const detailsY = yPosition + 10;
  doc.text('REPORT GENERATED:', margin + 10, detailsY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.darkGray);
  doc.text(formatDate(reportData.meta.report_generated_at), margin + 65, detailsY);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.mediumGray);
  doc.text('ANALYSIS PERIOD:', margin + 10, detailsY + 7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.darkGray);
  doc.text(`${reportData.meta.params_used.days} days`, margin + 65, detailsY + 7);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.mediumGray);
  doc.text('DEPARTMENT:', margin + 10, detailsY + 14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.darkGray);
  const deptText = doc.splitTextToSize(reportData.meta.params_used.department, pageWidth - 2 * margin - 80);
  doc.text(deptText[0], margin + 65, detailsY + 14);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.mediumGray);
  doc.text('ITEMS:', margin + 10, detailsY + 21);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.darkGray);
  const itemsText = doc.splitTextToSize(reportData.meta.params_used.offeredItem || 'Various items', pageWidth - 2 * margin - 80);
  doc.text(itemsText.slice(0, 2), margin + 65, detailsY + 21);
  
  // KPI Cards Section
  yPosition = 150;
  addSectionHeader('Performance Overview', '', colors.deepBlue);
  
  // 4 KPI cards in 2x2 grid
  const kpiCardWidth = (pageWidth - 2 * margin - 12) / 2;
  const kpiCardHeight = 28;
  
  // Card 1: Win Rate - with gradient background
  doc.setFillColor(240, 253, 244); // Light green gradient start
  doc.roundedRect(margin, yPosition, kpiCardWidth, kpiCardHeight, 4, 4, 'F');
  doc.setFillColor(16, 185, 129, 0.1); // Gradient overlay
  doc.roundedRect(margin, yPosition, kpiCardWidth, kpiCardHeight / 2, 4, 4, 'F');
  
  drawCard(doc, margin, yPosition, kpiCardWidth, kpiCardHeight, colors.successGreen);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.successGreen);
  doc.text(`${winRate.toFixed(1)}%`, margin + kpiCardWidth / 2, yPosition + 15, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.mediumGray);
  doc.text('Win Rate', margin + kpiCardWidth / 2, yPosition + 22, { align: 'center' });
  
  // Card 2: Total Bids - with gradient
  doc.setFillColor(239, 246, 255); // Light blue gradient
  doc.roundedRect(margin + kpiCardWidth + 12, yPosition, kpiCardWidth, kpiCardHeight, 4, 4, 'F');
  
  drawCard(doc, margin + kpiCardWidth + 12, yPosition, kpiCardWidth, kpiCardHeight, colors.brightBlue);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.brightBlue);
  doc.text(totalBids.toString(), margin + kpiCardWidth + 12 + kpiCardWidth / 2, yPosition + 15, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.mediumGray);
  doc.text('Total Bids', margin + kpiCardWidth + 12 + kpiCardWidth / 2, yPosition + 22, { align: 'center' });
  
  yPosition += kpiCardHeight + 8;
  
  // Card 3: Success Count - with gradient
  doc.setFillColor(243, 232, 255); // Light purple gradient
  doc.roundedRect(margin, yPosition, kpiCardWidth, kpiCardHeight, 4, 4, 'F');
  
  drawCard(doc, margin, yPosition, kpiCardWidth, kpiCardHeight, colors.purple);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.purple);
  doc.text(successCount.toString(), margin + kpiCardWidth / 2, yPosition + 15, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.mediumGray);
  doc.text('Successful Wins', margin + kpiCardWidth / 2, yPosition + 22, { align: 'center' });
  
  // Card 4: Total Value - with gradient
  doc.setFillColor(254, 243, 199); // Light orange gradient
  doc.roundedRect(margin + kpiCardWidth + 12, yPosition, kpiCardWidth, kpiCardHeight, 4, 4, 'F');
  
  drawCard(doc, margin + kpiCardWidth + 12, yPosition, kpiCardWidth, kpiCardHeight, colors.warningOrange);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.warningOrange);
  doc.text(formatCurrency(totalValue), margin + kpiCardWidth + 12 + kpiCardWidth / 2, yPosition + 15, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.mediumGray);
  doc.text('Total Value', margin + kpiCardWidth + 12 + kpiCardWidth / 2, yPosition + 22, { align: 'center' });
  
  yPosition += kpiCardHeight + 12;
  
  // Donut Chart Section
  checkPageBreak(70);
  
  const chartCardHeight = 65;
  drawCard(doc, margin, yPosition, pageWidth - 2 * margin, chartCardHeight);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.darkGray);
  doc.text('Win/Loss Distribution', margin + 10, yPosition + 10);
  
  // Draw donut chart
  const donutCenterX = margin + 35;
  const donutCenterY = yPosition + 38;
  const donutData = [
    { label: 'Wins', value: successCount, color: colors.successGreen },
    { label: 'Losses', value: losses, color: colors.errorRed }
  ];
  drawModernDonutChart(doc, donutCenterX, donutCenterY, 20, 12, donutData);
  
  // Center text in donut
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.darkGray);
  doc.text(`${winRate.toFixed(1)}%`, donutCenterX, donutCenterY + 3, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.mediumGray);
  doc.text('Win Rate', donutCenterX, donutCenterY + 8, { align: 'center' });
  
  // Legend
  const legendX = margin + 70;
  let legendY = yPosition + 25;
  
  doc.setFillColor(...colors.successGreen);
  doc.roundedRect(legendX, legendY, 4, 4, 1, 1, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.darkGray);
  doc.text(`Wins: ${successCount} (${winRate.toFixed(1)}%)`, legendX + 8, legendY + 3);
  
  legendY += 8;
  doc.setFillColor(...colors.errorRed);
  doc.roundedRect(legendX, legendY, 4, 4, 1, 1, 'F');
  doc.text(`Losses: ${losses} (${(100 - winRate).toFixed(1)}%)`, legendX + 8, legendY + 3);
  
  // Quick stats
  legendY += 12;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.mediumGray);
  doc.text('Avg Order Value:', legendX, legendY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatCurrency(avgValue), legendX + 35, legendY);
  
  legendY += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Avg Bids/Day:', legendX, legendY);
  doc.setFont('helvetica', 'normal');
  doc.text(avgBidsPerDay.toFixed(2), legendX + 35, legendY);
  
  // ============ PAGE 2: AI INSIGHTS ============
  addNewPage();
  
  addSectionHeader('AI-Powered Strategic Insights', '', colors.purple);
  
  // AI Summary Card
  const aiSummary = reportData.data.missedButWinnable?.ai?.strategy_summary || '';
  const summaryCardHeight = 55;
  
  drawCard(doc, margin, yPosition, pageWidth - 2 * margin, summaryCardHeight, colors.purple);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.purple);
  doc.text('Strategic Summary', margin + 10, yPosition + 8);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.darkGray);
  const summaryLines = doc.splitTextToSize(aiSummary, pageWidth - 2 * margin - 25);
  doc.text(summaryLines.slice(0, 7), margin + 10, yPosition + 15);
  
  yPosition += summaryCardHeight + 12;
  
  // Organization Affinity
  checkPageBreak(80);
  addSectionHeader('Organization Affinity Analysis', '', colors.brightBlue);
  
  const orgAffinity = reportData.data.missedButWinnable?.ai?.signals?.org_affinity || [];
  if (orgAffinity.length > 0) {
    const orgData = orgAffinity.slice(0, 8).map((org) => {
      const winCount = wins.filter(w => w.org === org.org).length;
      const percentage = totalBids > 0 ? (winCount / totalBids) * 100 : 0;
      return {
        label: org.org,
        value: winCount,
        percentage: percentage,
        color: percentage > 40 ? colors.successGreen : percentage > 20 ? colors.brightBlue : colors.warningOrange
      };
    });
    
    const chartHeight = orgData.length * 20 + 10;
    drawCard(doc, margin, yPosition, pageWidth - 2 * margin, chartHeight);
    drawModernBarChart(doc, margin + 10, yPosition + 8, pageWidth - 2 * margin - 80, orgData, true);
    yPosition += chartHeight + 12;
  }
  
  // Department Affinity
  checkPageBreak(80);
  addSectionHeader('Department Performance', '', colors.successGreen);
  
  const deptAffinity = reportData.data.missedButWinnable?.ai?.signals?.dept_affinity || [];
  if (deptAffinity.length > 0) {
    const deptData = deptAffinity.slice(0, 8).map((dept) => {
      const deptWins = wins.filter(w => w.dept === dept.dept);
      const deptValue = deptWins.reduce((sum, w) => sum + (w.total_price || 0), 0);
      const percentage = totalValue > 0 ? (deptValue / totalValue) * 100 : 0;
      return {
        label: dept.dept,
        value: deptValue,
        percentage: percentage,
        color: percentage > 40 ? colors.successGreen : percentage > 20 ? colors.brightBlue : colors.warningOrange
      };
    });
    
    const chartHeight = deptData.length * 20 + 10;
    drawCard(doc, margin, yPosition, pageWidth - 2 * margin, chartHeight);
    drawModernBarChart(doc, margin + 10, yPosition + 8, pageWidth - 2 * margin - 80, deptData, true);
    yPosition += chartHeight + 12;
  }
  
  // ============ PAGE 3: PERFORMANCE DETAILS ============
  if (filters.includeSections.includes('bidsSummary') && wins.length > 0) {
    checkPageBreak(100);
    addSectionHeader('Recent Successful Bids', '', colors.successGreen);
    
    // Stats row
    drawCard(doc, margin, yPosition, pageWidth - 2 * margin, 20);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.mediumGray);
    doc.text('Total Wins:', margin + 10, yPosition + 8);
    doc.setTextColor(...colors.successGreen);
    doc.text(successCount.toString(), margin + 35, yPosition + 8);
    
    doc.setTextColor(...colors.mediumGray);
    doc.text('Total Value:', margin + 70, yPosition + 8);
    doc.setTextColor(...colors.successGreen);
    doc.text(formatCurrency(totalValue), margin + 100, yPosition + 8);
    
    doc.setTextColor(...colors.mediumGray);
    doc.text('Average:', margin + 135, yPosition + 8);
    doc.setTextColor(...colors.successGreen);
    doc.text(formatCurrency(avgValue), margin + 158, yPosition + 8);
    
    yPosition += 25;
    
    // Wins table
    const winsTableData = wins.slice(0, 10).map((win, index) => [
      (index + 1).toString(),
      (win.bid_number || 'N/A').substring(0, 18),
      (win.org || 'N/A').substring(0, 25),
      (win.dept || 'N/A').substring(0, 20),
      win.quantity?.toString() || '0',
      formatCurrency(win.total_price || 0),
      formatDate(win.ended_at || win.created_at)
    ]);
    
    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Bid Number', 'Organization', 'Department', 'Qty', 'Value', 'Date']],
      body: winsTableData,
      theme: 'plain',
      headStyles: { 
        fillColor: colors.deepBlue,
        textColor: colors.white,
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 3
      },
      bodyStyles: { 
        fontSize: 7,
        cellPadding: 2.5
      },
      alternateRowStyles: { 
        fillColor: colors.lightBlue 
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 30, fontSize: 6 },
        2: { cellWidth: 42 },
        3: { cellWidth: 35 },
        4: { cellWidth: 12, halign: 'right' },
        5: { cellWidth: 22, halign: 'right', textColor: colors.successGreen, fontStyle: 'bold' },
        6: { cellWidth: 20, halign: 'center', fontSize: 7 }
      },
      margin: { left: margin, right: margin },
      didDrawPage: (data) => {
        addPageHeader();
        addPageFooter();
      }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 12;
  }
  
  // ============ PAGE 4: RECOMMENDATIONS ============
  if (reportData.data.missedButWinnable?.ai?.guidance?.next_steps) {
    checkPageBreak(100);
    addSectionHeader('Strategic Recommendations', '', colors.warningOrange);
    
    const recommendations = reportData.data.missedButWinnable.ai.guidance.next_steps;
    const cardWidth = (pageWidth - 2 * margin - 12) / 2;
    const cardHeight = 45;
    let cardCount = 0;
    
    recommendations.slice(0, 6).forEach((rec, index) => {
      if (cardCount % 2 === 0 && cardCount > 0) {
        yPosition += cardHeight + 8;
        checkPageBreak(cardHeight + 10);
      }
      
      const cardX = margin + (cardCount % 2) * (cardWidth + 12);
      const cardY = yPosition;
      
      // Colored background based on priority
      const bgColors = [colors.lightBlue, [240, 253, 244], [254, 243, 199]];
      const accentColors = [colors.brightBlue, colors.successGreen, colors.warningOrange];
      const bgColorIndex = index % 3;
      
      doc.setFillColor(...bgColors[bgColorIndex] as [number, number, number]);
      doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 4, 4, 'F');
      
      // Accent left border
      doc.setFillColor(...accentColors[bgColorIndex]);
      doc.rect(cardX, cardY, 3, cardHeight, 'F');
      
      // Border
      doc.setDrawColor(...colors.borderGray);
      doc.setLineWidth(0.3);
      doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 4, 4, 'S');
      
      // Icon badge with number
      doc.setFillColor(...accentColors[bgColorIndex]);
      doc.circle(cardX + 12, cardY + 10, 5, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.white);
      doc.text((index + 1).toString(), cardX + 12, cardY + 12, { align: 'center' });
      
      // Title
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.darkGray);
      const title = `Action ${index + 1}`;
      doc.text(title, cardX + 20, cardY + 10);
      
      // Description
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.mediumGray);
      const descLines = doc.splitTextToSize(rec, cardWidth - 25);
      doc.text(descLines.slice(0, 4), cardX + 10, cardY + 18);
      
      cardCount++;
    });
    
    yPosition += cardHeight + 12;
  }
  
  // ============ PAGE 5: OPPORTUNITIES ============
  if (filters.includeSections.includes('lowCompetition')) {
    checkPageBreak(100);
    addSectionHeader('Low Competition Opportunities', '', colors.amber);
    
    const opportunities = reportData.data.lowCompetitionBids?.results || [];
    if (opportunities.length > 0) {
      // Opportunity stats
      drawCard(doc, margin, yPosition, pageWidth - 2 * margin, 18);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.mediumGray);
      doc.text('Total Opportunities:', margin + 10, yPosition + 8);
      doc.setTextColor(...colors.amber);
      doc.text(opportunities.length.toString(), margin + 55, yPosition + 8);
      
      doc.setTextColor(...colors.mediumGray);
      doc.text('Single Competitor:', margin + 90, yPosition + 8);
      doc.setTextColor(...colors.successGreen);
      const singleComp = opportunities.filter(o => o.seller_count === '1').length;
      doc.text(singleComp.toString(), margin + 135, yPosition + 8);
      
      yPosition += 23;
      
      // Opportunities table
      const oppTableData = opportunities.slice(0, 15).map((opp, index) => {
        const org = (opp.organisation || 'N/A').substring(0, 30);
        const bidNum = (opp.bid_number || 'N/A').substring(0, 20);
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
      
      autoTable(doc, {
        startY: yPosition,
        head: [['#', 'Bid Number', 'Organization', 'Qty', 'Rivals', 'End Date', 'Status']],
        body: oppTableData,
        theme: 'plain',
        headStyles: { 
          fillColor: colors.amber,
          textColor: colors.white,
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center',
          cellPadding: 3
        },
        bodyStyles: { 
          fontSize: 7,
          cellPadding: 2.5
        },
        alternateRowStyles: { 
          fillColor: [254, 243, 199] 
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 38, fontSize: 6 },
          2: { cellWidth: 55 },
          3: { cellWidth: 12, halign: 'right' },
          4: { cellWidth: 15, halign: 'center', textColor: colors.successGreen, fontStyle: 'bold' },
          5: { cellWidth: 22, halign: 'center', fontSize: 7 },
          6: { cellWidth: 19, halign: 'center', fontSize: 7 }
        },
        margin: { left: margin, right: margin },
        didDrawPage: (data) => {
          addPageHeader();
          addPageFooter();
        }
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 12;
    }
  }
  
  // ============ PAGE 6: MARKET ANALYSIS ============
  if (filters.includeSections.includes('categoryAnalysis')) {
    checkPageBreak(100);
    addSectionHeader('Category Distribution', '', colors.purple);
    
    const categories = reportData.data.categoryListing || [];
    if (categories.length > 0) {
      const topCategories = categories.slice(0, 10);
      const totalCount = topCategories.reduce((sum, cat) => sum + cat.count, 0);
      
      const categoryData = topCategories.map((cat) => ({
        label: cat.category,
        value: cat.count,
        percentage: (cat.count / totalCount) * 100,
        color: colors.brightBlue
      }));
      
      const chartHeight = categoryData.length * 20 + 10;
      drawCard(doc, margin, yPosition, pageWidth - 2 * margin, chartHeight);
      drawModernBarChart(doc, margin + 10, yPosition + 8, pageWidth - 2 * margin - 80, categoryData, true);
      yPosition += chartHeight + 12;
    }
  }
  
  // ============ PAGE 7: TOP PERFORMING STATES ============
  if (filters.includeSections.includes('statesAnalysis') && reportData.data.topPerformingStates?.results) {
    checkPageBreak(100);
    addSectionHeader('Top Performing States', '', colors.successGreen);
    
    const statesData = reportData.data.topPerformingStates.results.slice(0, 10).map((state) => ({
      label: state.state_name,
      value: Number(state.total_tenders),
      percentage: 0,
      color: colors.successGreen
    }));
    
    if (statesData.length > 0) {
      const chartHeight = statesData.length * 20 + 10;
      drawCard(doc, margin, yPosition, pageWidth - 2 * margin, chartHeight);
      drawModernBarChart(doc, margin + 10, yPosition + 8, pageWidth - 2 * margin - 80, statesData, false);
      yPosition += chartHeight + 12;
    }
  }
  
  // ============ PAGE 8: TOP DEPARTMENTS ============
  if (filters.includeSections.includes('departmentsAnalysis') && reportData.data.allDepartments) {
    checkPageBreak(100);
    addSectionHeader('Top Departments by Tender Volume', '', colors.deepBlue);
    
    const deptData = reportData.data.allDepartments.slice(0, 10).map((dept) => ({
      label: dept.department,
      value: Number(dept.total_tenders),
      percentage: 0,
      color: colors.deepBlue
    }));
    
    if (deptData.length > 0) {
      const chartHeight = deptData.length * 20 + 10;
      drawCard(doc, margin, yPosition, pageWidth - 2 * margin, chartHeight);
      drawModernBarChart(doc, margin + 10, yPosition + 8, pageWidth - 2 * margin - 80, deptData, false);
      yPosition += chartHeight + 12;
    }
  }
  
  // ============ FINAL PAGE: DISCLAIMER ============
  checkPageBreak(60);
  
  // Disclaimer box
  const disclaimerHeight = 50;
  doc.setFillColor(254, 242, 242); // Light red background
  doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, disclaimerHeight, 4, 4, 'F');
  
  doc.setDrawColor(...colors.errorRed);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, disclaimerHeight, 4, 4, 'S');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.errorRed);
  doc.text('Important Disclaimer', margin + 10, yPosition + 10);
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.darkGray);
  const disclaimerText = 'This report is generated based on available public data and AI analysis. While we strive for accuracy, we cannot guarantee the completeness or correctness of all information. Bid decisions should be made based on thorough due diligence and official tender documents. Past performance does not guarantee future results.';
  const disclaimerLines = doc.splitTextToSize(disclaimerText, pageWidth - 2 * margin - 25);
  doc.text(disclaimerLines, margin + 10, yPosition + 18);
  
  yPosition += disclaimerHeight + 10;
  
  // Footer info
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.mediumGray);
  doc.text('© 2025 Government Tender Analysis Platform. All rights reserved.', pageWidth / 2, yPosition, { align: 'center' });
  doc.text('For support: support@tenderanalysis.com', pageWidth / 2, yPosition + 5, { align: 'center' });

  return doc;
};
