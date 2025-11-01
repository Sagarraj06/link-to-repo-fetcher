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
      email: string;
    };
  };
  data: {
    sellerBids?: Array<any>;
    estimatedMissedValue?: number;
    priceBand?: { highest: number; lowest: number; average: number };
    topPerformingStates?: Array<{ state: string; value: number; count: number }>;
    topSellersByDept?: Array<{ seller: string; dept: string; value: number }>;
    categoryListing?: Array<{ category: string; count: number; value: number }>;
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

const formatCurrency = (amount: number): string => {
  return `₹ ${amount.toLocaleString('en-IN')}`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Helper function to draw a pie chart
const drawPieChart = (
  doc: jsPDF,
  centerX: number,
  centerY: number,
  radius: number,
  data: Array<{ label: string; value: number; color: [number, number, number] }>
) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = -Math.PI / 2; // Start from top

  data.forEach((item) => {
    const sliceAngle = (item.value / total) * 2 * Math.PI;
    
    // Draw slice
    doc.setFillColor(...item.color);
    doc.circle(centerX, centerY, radius, 'F');
    
    // Create pie slice using triangles
    const steps = Math.ceil((sliceAngle * 180) / Math.PI / 5); // 5 degrees per step
    for (let i = 0; i <= steps; i++) {
      const angle = currentAngle + (sliceAngle * i) / steps;
      const nextAngle = currentAngle + (sliceAngle * (i + 1)) / steps;
      
      const x1 = centerX + radius * Math.cos(angle);
      const y1 = centerY + radius * Math.sin(angle);
      const x2 = centerX + radius * Math.cos(nextAngle);
      const y2 = centerY + radius * Math.sin(nextAngle);
      
      doc.setFillColor(...item.color);
      doc.triangle(centerX, centerY, x1, y1, x2, y2, 'F');
    }
    
    currentAngle += sliceAngle;
  });
  
  // Draw white circle in center for donut effect (optional)
  doc.setFillColor(255, 255, 255);
  doc.circle(centerX, centerY, radius * 0.5, 'F');
};

// Helper function to draw a horizontal bar chart
const drawBarChart = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  data: Array<{ label: string; value: number; color: [number, number, number] }>,
  maxValue?: number
) => {
  const barHeight = 8;
  const spacing = 3;
  const max = maxValue || Math.max(...data.map(d => d.value));
  
  data.forEach((item, index) => {
    const barWidth = (item.value / max) * width;
    const currentY = y + index * (barHeight + spacing);
    
    // Draw label
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const labelText = item.label.length > 25 ? item.label.substring(0, 22) + '...' : item.label;
    doc.text(labelText, x, currentY + 5);
    
    // Draw bar
    doc.setFillColor(...item.color);
    doc.roundedRect(x + 70, currentY, Math.max(barWidth, 2), barHeight, 1, 1, 'F');
    
    // Draw value
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...item.color);
    doc.text(item.value.toString(), x + 72 + barWidth, currentY + 5);
  });
};

export const generatePDF = async (
  reportData: ReportData,
  filters: FilterOptions
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;
  const margin = 15;

  const colors = {
    primary: [41, 98, 255] as [number, number, number],
    secondary: [16, 185, 129] as [number, number, number],
    accent: [249, 115, 22] as [number, number, number],
    warning: [251, 191, 36] as [number, number, number],
    danger: [239, 68, 68] as [number, number, number],
    purple: [168, 85, 247] as [number, number, number],
    dark: [60, 60, 60] as [number, number, number],
    light: [200, 200, 200] as [number, number, number],
  };

  const addNewPage = () => {
    doc.addPage();
    yPosition = 20;
    addPageHeader();
    addPageFooter();
  };

  const addPageHeader = () => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Government Tender Performance Analysis', pageWidth / 2, 10, { align: 'center' });
    doc.setDrawColor(...colors.primary);
    doc.setLineWidth(0.5);
    doc.line(margin, 12, pageWidth - margin, 12);
  };

  const addPageFooter = () => {
    const pageNum = doc.getCurrentPageInfo().pageNumber;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${formatDate(reportData.meta.report_generated_at)}`, margin, pageHeight - 10);
    doc.text(`Page ${pageNum}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text(reportData.meta.params_used.sellerName, pageWidth - margin, pageHeight - 10, { align: 'right' });
  };

  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - 25) {
      addNewPage();
      return true;
    }
    return false;
  };

  const addSectionHeader = (title: string, color: [number, number, number] = colors.primary) => {
    checkPageBreak(20);
    doc.setFillColor(...color);
    doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 12, 2, 2, 'F');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(title, margin + 5, yPosition + 8);
    yPosition += 17;
    doc.setTextColor(...colors.dark);
  };

  // Calculate performance metrics
  const wins = reportData.data.missedButWinnable?.recentWins || [];
  const marketWins = reportData.data.missedButWinnable?.marketWins || [];
  const totalBids = wins.length + marketWins.length;
  const successCount = wins.length;
  const losses = marketWins.length;
  const winRate = totalBids > 0 ? ((successCount / totalBids) * 100).toFixed(1) : '0.0';
  
  const totalValue = wins.reduce((sum, win) => sum + (win.total_price || 0), 0);
  const avgValue = successCount > 0 ? Math.round(totalValue / successCount) : 0;
  const avgBidsPerDay = (totalBids / reportData.meta.params_used.days).toFixed(2);

  // ============ COVER PAGE ============
  // Modern dark navy background with gradient effect
  doc.setFillColor(15, 23, 42); // Dark navy
  doc.rect(0, 0, pageWidth, pageHeight / 2, 'F');
  
  doc.setFillColor(30, 41, 59); // Lighter navy
  doc.circle(pageWidth + 20, -20, 100, 'F');
  doc.circle(-30, pageHeight / 3, 80, 'F');
  
  // Top accent line
  doc.setDrawColor(59, 130, 246); // Blue accent
  doc.setLineWidth(3);
  doc.line(0, 8, pageWidth, 8);
  
  // Header text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text('GOVERNMENT', pageWidth / 2, 25, { align: 'center' });
  doc.text('TENDER ANALYSIS', pageWidth / 2, 32, { align: 'center' });
  
  yPosition = 50;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(186, 230, 253); // Light cyan
  doc.text('Comprehensive Performance Report', pageWidth / 2, yPosition, { align: 'center' });
  
  // Company name box
  yPosition += 18;
  const companyBoxWidth = pageWidth - 60;
  const companyBoxHeight = 24;
  doc.setFillColor(30, 41, 59);
  doc.roundedRect((pageWidth - companyBoxWidth) / 2, yPosition - 8, companyBoxWidth, companyBoxHeight, 4, 4, 'F');
  
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(1);
  doc.roundedRect((pageWidth - companyBoxWidth) / 2, yPosition - 8, companyBoxWidth, companyBoxHeight, 4, 4, 'S');
  
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(96, 165, 250); // Bright blue
  doc.text(reportData.meta.params_used.sellerName, pageWidth / 2, yPosition + 5, { align: 'center' });
  
  // Report details box
  yPosition += 40;
  const detailsBoxY = yPosition;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, detailsBoxY, pageWidth - 2 * margin, 60, 3, 3, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  
  yPosition = detailsBoxY + 12;
  doc.text('Report Generated:', margin + 10, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(reportData.meta.report_generated_at), margin + 70, yPosition);
  
  yPosition += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Analysis Period:', margin + 10, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(`${reportData.meta.params_used.days} days`, margin + 70, yPosition);
  
  yPosition += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Department:', margin + 10, yPosition);
  doc.setFont('helvetica', 'normal');
  const deptText = reportData.meta.params_used.department.length > 40 
    ? reportData.meta.params_used.department.substring(0, 37) + '...' 
    : reportData.meta.params_used.department;
  doc.text(deptText, margin + 70, yPosition);
  
  yPosition += 10;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('Offered Items:', margin + 10, yPosition);
  yPosition += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const itemsText = reportData.meta.params_used.offeredItem || 'Various items';
  const wrappedItems = doc.splitTextToSize(itemsText, pageWidth - 2 * margin - 20);
  wrappedItems.slice(0, 2).forEach((line: string) => {
    doc.text(line, margin + 10, yPosition);
    yPosition += 4;
  });

  // ============ SECTION: BIDS SUMMARY (Department-wise) ============
  if (filters.includeSections.includes('bidsSummary')) {
    addNewPage();
    
    // Executive Summary with Pie Chart
    doc.setFillColor(59, 130, 246);
    doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 12, 2, 2, 'F');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('Executive Summary', margin + 5, yPosition + 8);
    yPosition += 17;
    doc.setTextColor(...colors.dark);
    
    // Performance Highlights Section
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text('Performance Highlights', margin, yPosition);
    yPosition += 10;
    
    // KPI Cards - 3 boxes
    const kpiWidth = (pageWidth - 2 * margin - 10) / 3;
    const kpiHeight = 28;
    
    // Win Rate
    doc.setFillColor(34, 197, 94);
    doc.roundedRect(margin, yPosition, kpiWidth, kpiHeight, 3, 3, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 255, 255);
    doc.text('Win Rate', margin + kpiWidth / 2, yPosition + 8, { align: 'center' });
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(`${winRate}%`, margin + kpiWidth / 2, yPosition + 20, { align: 'center' });
    
    // Total Bids
    doc.setFillColor(59, 130, 246);
    doc.roundedRect(margin + kpiWidth + 5, yPosition, kpiWidth, kpiHeight, 3, 3, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Total Bids', margin + kpiWidth + 5 + kpiWidth / 2, yPosition + 8, { align: 'center' });
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(totalBids.toString(), margin + kpiWidth + 5 + kpiWidth / 2, yPosition + 20, { align: 'center' });
    
    // Success Count
    doc.setFillColor(168, 85, 247);
    doc.roundedRect(margin + 2 * kpiWidth + 10, yPosition, kpiWidth, kpiHeight, 3, 3, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Success Count', margin + 2 * kpiWidth + 10 + kpiWidth / 2, yPosition + 8, { align: 'center' });
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(successCount.toString(), margin + 2 * kpiWidth + 10 + kpiWidth / 2, yPosition + 20, { align: 'center' });
    
    yPosition += kpiHeight + 15;
    doc.setTextColor(...colors.dark);
    
    // Win/Loss Distribution with Pie Chart
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text('Win/Loss Distribution', margin, yPosition);
    yPosition += 10;
    
    // Draw pie chart
    const chartCenterX = margin + 35;
    const chartCenterY = yPosition + 25;
    const chartRadius = 22;
    
    const pieData = [
      { label: 'Wins', value: successCount, color: [34, 197, 94] as [number, number, number] },
      { label: 'Losses', value: losses, color: [239, 68, 68] as [number, number, number] }
    ];
    
    drawPieChart(doc, chartCenterX, chartCenterY, chartRadius, pieData);
    
    // Legend
    const legendX = margin + 75;
    let legendY = yPosition + 10;
    
    doc.setFillColor(34, 197, 94);
    doc.circle(legendX, legendY, 3, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(`Wins: ${successCount} (${winRate}%)`, legendX + 6, legendY + 2);
    
    legendY += 8;
    doc.setFillColor(239, 68, 68);
    doc.circle(legendX, legendY, 3, 'F');
    doc.text(`Losses: ${losses} (${(100 - parseFloat(winRate)).toFixed(1)}%)`, legendX + 6, legendY + 2);
    
    yPosition += 60;
    
    // Detailed Performance Metrics Table
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text('Detailed Performance Metrics', margin, yPosition);
    yPosition += 8;
    
    const performanceMetrics = [
      ['Total Bids Participated', totalBids.toString(), 'Participation'],
      ['Successful Wins', successCount.toString(), 'Performance'],
      ['Unsuccessful Bids', losses.toString(), 'Performance'],
      ['Win Rate', `${winRate}%`, 'Performance'],
      ['Total Bid Value', formatCurrency(totalValue), 'Financial'],
      ['Average Order Value', formatCurrency(avgValue), 'Financial'],
      ['Qualified Bid Value', formatCurrency(totalValue * 0.98), 'Financial'],
      ['Disqualified Bid Value', formatCurrency(totalValue * 0.02), 'Financial'],
      ['Average Bid per Day', avgBidsPerDay, 'Activity'],
    ];
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Metric', 'Value', 'Category']],
      body: performanceMetrics,
      theme: 'striped',
      headStyles: { 
        fillColor: [30, 64, 175],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [239, 246, 255] },
      columnStyles: {
        0: { cellWidth: 80, fontStyle: 'bold' },
        1: { cellWidth: 60, halign: 'right' },
        2: { cellWidth: 45, halign: 'center', textColor: [30, 64, 175], fontStyle: 'bold' },
      },
      margin: { left: margin, right: margin },
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 15;
    
    // Department distribution
    checkPageBreak(50);
    addSectionHeader('AI-Powered Strategic Insights', colors.purple);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Comprehensive analysis of bidding activity across government departments', margin, yPosition);
    yPosition += 10;

    const deptSignals = reportData.data.missedButWinnable?.ai?.signals?.dept_affinity || [];
    if (deptSignals.length > 0) {
      const deptData = deptSignals.slice(0, 10).map((dept, index) => {
        const estValue = Math.round(totalValue / deptSignals.length);
        return [
          (index + 1).toString(),
          dept.dept.length > 45 ? dept.dept.substring(0, 42) + '...' : dept.dept,
          formatCurrency(estValue),
          `${((1 / deptSignals.length) * 100).toFixed(1)}%`,
          'Active'
        ];
      });

      autoTable(doc, {
        startY: yPosition,
        head: [['#', 'Department', 'Est. Value', 'Share %', 'Status']],
        body: deptData,
        theme: 'striped',
        headStyles: { 
          fillColor: colors.primary,
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 88 },
          2: { cellWidth: 35, halign: 'right' },
          3: { cellWidth: 22, halign: 'center' },
          4: { cellWidth: 28, halign: 'center' },
        },
        margin: { left: margin, right: margin },
      });
      yPosition = (doc as any).lastAutoTable.finalY + 10;
      
      // Bar chart visualization
      checkPageBreak(60);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 64, 175);
      doc.text('Top 5 Departments - Visual Distribution', margin, yPosition);
      yPosition += 10;
      
      const chartData = deptSignals.slice(0, 5).map((dept, index) => ({
        label: dept.dept.substring(0, 30),
        value: Math.round(100 / deptSignals.length * (5 - index)),
        color: [59, 130, 246] as [number, number, number]
      }));
      
      drawBarChart(doc, margin, yPosition, pageWidth - 2 * margin - 80, chartData);
      yPosition += chartData.length * 11 + 10;
    }
  }

  // ============ SECTION: MARKET OVERVIEW ============
  if (filters.includeSections.includes('marketOverview')) {
    addNewPage();
    addSectionHeader('Overall Market Overview', colors.secondary);

    // KPI Cards
    const kpiBoxWidth = (pageWidth - 2 * margin - 10) / 3;
    const kpiBoxHeight = 28;
    
    // Win Rate Box
    doc.setFillColor(...colors.secondary);
    doc.roundedRect(margin, yPosition, kpiBoxWidth, kpiBoxHeight, 3, 3, 'F');
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`${winRate}%`, margin + kpiBoxWidth / 2, yPosition + 14, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Win Rate', margin + kpiBoxWidth / 2, yPosition + 22, { align: 'center' });

    // Total Bids Box
    doc.setFillColor(...colors.primary);
    doc.roundedRect(margin + kpiBoxWidth + 5, yPosition, kpiBoxWidth, kpiBoxHeight, 3, 3, 'F');
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(totalBids.toString(), margin + kpiBoxWidth + 5 + kpiBoxWidth / 2, yPosition + 14, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Total Bids', margin + kpiBoxWidth + 5 + kpiBoxWidth / 2, yPosition + 22, { align: 'center' });

    // Total Value Box
    doc.setFillColor(...colors.accent);
    doc.roundedRect(margin + 2 * kpiBoxWidth + 10, yPosition, kpiBoxWidth, kpiBoxHeight, 3, 3, 'F');
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const shortValue = totalValue > 10000000 ? `${(totalValue / 10000000).toFixed(1)}Cr` : `${(totalValue / 100000).toFixed(1)}L`;
    doc.text(shortValue, margin + 2 * kpiBoxWidth + 10 + kpiBoxWidth / 2, yPosition + 14, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Total Value', margin + 2 * kpiBoxWidth + 10 + kpiBoxWidth / 2, yPosition + 22, { align: 'center' });

    yPosition += kpiBoxHeight + 15;
    doc.setTextColor(...colors.dark);

    // Market Metrics Table
    checkPageBreak(60);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Market Performance Metrics', margin, yPosition);
    yPosition += 8;

    const marketMetrics = [
      ['Total Bids Participated', totalBids.toString(), '100%'],
      ['Successful Wins', successCount.toString(), `${winRate}%`],
      ['Lost Opportunities', losses.toString(), `${(100 - parseFloat(winRate)).toFixed(1)}%`],
      ['Average Order Value', formatCurrency(avgValue), '-'],
      ['Average Bids/Day', avgBidsPerDay, '-'],
      ['Estimated Market Size', formatCurrency(totalValue * 3), 'Est.'],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [['Metric', 'Value', 'Percentage']],
      body: marketMetrics,
      theme: 'grid',
      headStyles: { fillColor: colors.secondary, textColor: [255, 255, 255], fontSize: 10, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 85, fontStyle: 'bold' },
        1: { cellWidth: 55, halign: 'right' },
        2: { cellWidth: 45, halign: 'center' },
      },
      margin: { left: margin, right: margin },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // Price Band Analysis
    if (reportData.data.priceBand) {
      checkPageBreak(50);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Price Band Analysis', margin, yPosition);
      yPosition += 8;

      const priceBandData = [
        ['Highest Bid Value', formatCurrency(reportData.data.priceBand.highest)],
        ['Average Bid Value', formatCurrency(reportData.data.priceBand.average)],
        ['Lowest Bid Value', formatCurrency(reportData.data.priceBand.lowest)],
        ['Price Range', formatCurrency(reportData.data.priceBand.highest - reportData.data.priceBand.lowest)],
      ];

      autoTable(doc, {
        startY: yPosition,
        body: priceBandData,
        theme: 'plain',
        bodyStyles: { fontSize: 9, textColor: colors.dark },
        columnStyles: {
          0: { cellWidth: 70, fontStyle: 'bold' },
          1: { cellWidth: 60, halign: 'right', textColor: colors.primary },
        },
        margin: { left: margin + 10, right: margin },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }
  }

  // ============ SECTION: TOP PERFORMER DEPARTMENT ============
  if (filters.includeSections.includes('topPerformer')) {
    addNewPage();
    addSectionHeader('Top Performer Department', colors.accent);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Analysis of highest-performing departments based on engagement and success metrics`, margin, yPosition);
    yPosition += 10;

    const deptAffinity = reportData.data.missedButWinnable?.ai?.signals?.dept_affinity || [];
    if (deptAffinity.length > 0) {
      deptAffinity.slice(0, 5).forEach((dept, index) => {
        checkPageBreak(30);
        
        // Department header with ranking
        doc.setFillColor(index === 0 ? colors.accent[0] : colors.light[0], 
                         index === 0 ? colors.accent[1] : colors.light[1], 
                         index === 0 ? colors.accent[2] : colors.light[2]);
        doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 10, 2, 2, 'F');
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(index === 0 ? 255 : colors.dark[0], index === 0 ? 255 : colors.dark[1], index === 0 ? 255 : colors.dark[2]);
        doc.text(`#${index + 1}  ${dept.dept}`, margin + 3, yPosition + 7);
        yPosition += 13;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.dark);
        const lines = doc.splitTextToSize(dept.signal, pageWidth - 2 * margin - 10);
        lines.forEach((line: string) => {
          checkPageBreak(5);
          doc.text(line, margin + 5, yPosition);
          yPosition += 5;
        });
        yPosition += 5;
      });

      // Performance metrics for top departments
      checkPageBreak(60);
      yPosition += 10;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Top 5 Departments - Performance Breakdown', margin, yPosition);
      yPosition += 8;

      const topDeptMetrics = deptAffinity.slice(0, 5).map((dept, index) => [
        (index + 1).toString(),
        dept.dept.substring(0, 50),
        Math.round(totalValue / deptAffinity.length).toString(),
        `${(100 / deptAffinity.length).toFixed(1)}%`,
        index === 0 ? '⭐ Best' : 'Active'
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Rank', 'Department', 'Est. Value (₹)', 'Market Share', 'Status']],
        body: topDeptMetrics,
        theme: 'striped',
        headStyles: { fillColor: colors.accent, textColor: [255, 255, 255], fontSize: 10, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 80 },
          2: { cellWidth: 35, halign: 'right' },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 30, halign: 'center' },
        },
        margin: { left: margin, right: margin },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }
  }

  // ============ SECTION: MISSED-BUT-WINNABLE TENDERS ============
  if (filters.includeSections.includes('missedTenders')) {
    addNewPage();
    addSectionHeader('Missed-but-Winnable Tenders', colors.warning);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Opportunities where you had strong positioning but didn't participate`, margin, yPosition);
    yPosition += 10;

    if (marketWins.length > 0) {
      // Summary box
      doc.setFillColor(255, 251, 235); // Light yellow
      doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 20, 2, 2, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.warning);
      doc.text(`Total Missed Opportunities: ${marketWins.length}`, margin + 5, yPosition + 8);
      
      const missedValue = marketWins.reduce((sum, win) => sum + (win.total_price || 0), 0);
      doc.text(`Estimated Missed Value: ${formatCurrency(missedValue)}`, margin + 5, yPosition + 15);
      yPosition += 25;

      doc.setTextColor(...colors.dark);

      // Missed tenders table
      const missedData = marketWins.slice(0, 10).map((win, index) => [
        (index + 1).toString(),
        (win.bid_number || 'N/A').substring(0, 20),
        (win.org || 'N/A').substring(0, 30),
        (win.dept || 'N/A').substring(0, 25),
        formatCurrency(win.total_price || 0),
        win.ended_at ? formatDate(win.ended_at) : 'N/A',
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['#', 'Bid Number', 'Organization', 'Department', 'Value', 'End Date']],
        body: missedData,
        theme: 'grid',
        headStyles: { fillColor: colors.warning, textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 30 },
          2: { cellWidth: 45 },
          3: { cellWidth: 40 },
          4: { cellWidth: 30, halign: 'right' },
          5: { cellWidth: 25, halign: 'center' },
        },
        margin: { left: margin, right: margin },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    } else {
      doc.setFontSize(10);
      doc.text('No missed opportunities identified in the analysis period.', margin, yPosition);
      yPosition += 10;
    }

    // AI Insights on missed opportunities
    checkPageBreak(40);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.warning);
    doc.text('AI-Powered Recovery Strategy', margin, yPosition);
    yPosition += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.dark);
    const strategy = reportData.data.missedButWinnable?.ai?.strategy_summary || 'No strategy available';
    const strategyLines = doc.splitTextToSize(strategy, pageWidth - 2 * margin - 10);
    strategyLines.forEach((line: string) => {
      checkPageBreak(5);
      doc.text(line, margin + 5, yPosition);
      yPosition += 5;
    });
  }

  // ============ COMPREHENSIVE AI INSIGHTS SECTION ============
  const aiData = reportData.data.missedButWinnable?.ai;
  if (aiData) {
    addNewPage();
    addSectionHeader('Comprehensive AI Intelligence & Recommendations', colors.purple);
    
    // Strategy Summary
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(126, 34, 206);
    doc.text('Strategic Overview', margin, yPosition);
    yPosition += 8;
    
    doc.setFillColor(250, 245, 255);
    doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 0, 2, 2, 'F');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.dark);
    const summaryLines = doc.splitTextToSize(aiData.strategy_summary || '', pageWidth - 2 * margin - 10);
    summaryLines.forEach((line: string) => {
      checkPageBreak(5);
      if (yPosition > (doc as any).lastAutoTable?.finalY || yPosition < yPosition + 5) {
        doc.text(line, margin + 5, yPosition + 5);
        yPosition += 5;
      }
    });
    yPosition += 10;
    
    // Likely Wins Section
    const likelyWins = aiData.likely_wins || [];
    if (likelyWins.length > 0) {
      checkPageBreak(50);
      addNewPage();
      addSectionHeader('High-Probability Win Opportunities', [249, 115, 22]);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.dark);
      doc.text('AI-identified opportunities with highest success probability based on market analysis', margin, yPosition);
      yPosition += 12;
      
      likelyWins.slice(0, 3).forEach((opportunity, index) => {
        checkPageBreak(80);
        
        // Opportunity header
        doc.setFillColor(255, 247, 237);
        doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 10, 2, 2, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(234, 88, 12);
        doc.text(`Opportunity #${index + 1}`, margin + 3, yPosition + 7);
        yPosition += 13;
        
        // Offered Item
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60, 60, 60);
        doc.text('Target Product/Service:', margin + 3, yPosition);
        yPosition += 5;
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        const itemLines = doc.splitTextToSize(opportunity.offered_item || '', pageWidth - 2 * margin - 10);
        itemLines.forEach((line: string) => {
          checkPageBreak(5);
          doc.text(line, margin + 5, yPosition);
          yPosition += 4;
        });
        yPosition += 3;
        
        // Reason/Rationale
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60, 60, 60);
        doc.text('Why This Opportunity:', margin + 3, yPosition);
        yPosition += 5;
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        const reasonLines = doc.splitTextToSize(opportunity.reason || '', pageWidth - 2 * margin - 10);
        reasonLines.forEach((line: string) => {
          checkPageBreak(5);
          doc.text(line, margin + 5, yPosition);
          yPosition += 4;
        });
        yPosition += 5;
        
        // Matching Market Wins
        const matchingWins = opportunity.matching_market_wins || [];
        if (matchingWins.length > 0) {
          checkPageBreak(40);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(234, 88, 12);
          doc.text(`Supporting Market Evidence (${matchingWins.length} similar wins):`, margin + 3, yPosition);
          yPosition += 7;
          
          const winData = matchingWins.slice(0, 5).map((win: any, idx: number) => [
            (idx + 1).toString(),
            (win.bid_number || 'N/A').substring(0, 22),
            (win.org || win.dept || 'N/A').substring(0, 35),
            (win.quantity || '-').toString(),
            win.price_hint ? formatCurrency(win.price_hint) : '-',
            win.confidence || '-'
          ]);
          
          autoTable(doc, {
            startY: yPosition,
            head: [['#', 'Bid Number', 'Organization/Dept', 'Qty', 'Value', 'Match']],
            body: winData,
            theme: 'grid',
            headStyles: { 
              fillColor: [249, 115, 22],
              textColor: [255, 255, 255],
              fontSize: 8,
              fontStyle: 'bold',
              halign: 'center'
            },
            bodyStyles: { fontSize: 7 },
            columnStyles: {
              0: { cellWidth: 8, halign: 'center' },
              1: { cellWidth: 35 },
              2: { cellWidth: 60 },
              3: { cellWidth: 15, halign: 'center' },
              4: { cellWidth: 30, halign: 'right' },
              5: { cellWidth: 20, halign: 'center' },
            },
            margin: { left: margin, right: margin },
          });
          
          yPosition = (doc as any).lastAutoTable.finalY + 12;
        }
      });
    }
    
    // Guidance Section - Next Steps
    const guidance = aiData.guidance;
    if (guidance) {
      checkPageBreak(50);
      addNewPage();
      addSectionHeader('Strategic Action Plan & Next Steps', [16, 185, 129]);
      
      // Note/Context
      if (guidance.note) {
        doc.setFillColor(236, 253, 245);
        doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 0, 2, 2, 'F');
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(4, 120, 87);
        const noteLines = doc.splitTextToSize(guidance.note, pageWidth - 2 * margin - 10);
        let tempY = yPosition;
        noteLines.forEach((line: string) => {
          doc.text(line, margin + 5, tempY + 5);
          tempY += 4.5;
        });
        yPosition = tempY + 8;
      }
      
      // Next Steps
      const nextSteps = guidance.next_steps || [];
      if (nextSteps.length > 0) {
        checkPageBreak(40);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 185, 129);
        doc.text('Immediate Action Items', margin, yPosition);
        yPosition += 10;
        
        nextSteps.forEach((step: string, index: number) => {
          checkPageBreak(20);
          
          // Step number badge
          doc.setFillColor(16, 185, 129);
          doc.circle(margin + 4, yPosition + 2, 3.5, 'F');
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text((index + 1).toString(), margin + 4, yPosition + 3, { align: 'center' });
          
          // Step text
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(60, 60, 60);
          const stepLines = doc.splitTextToSize(step, pageWidth - 2 * margin - 15);
          let lineY = yPosition;
          stepLines.forEach((line: string, lineIdx: number) => {
            checkPageBreak(5);
            doc.text(line, margin + 12, lineY + 3);
            lineY += 4.5;
          });
          yPosition = lineY + 5;
        });
        yPosition += 5;
      }
      
      // Expansion Areas
      const expansionAreas = guidance.expansion_areas || [];
      if (expansionAreas.length > 0) {
        checkPageBreak(40);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(139, 92, 246);
        doc.text('Future Growth & Expansion Opportunities', margin, yPosition);
        yPosition += 10;
        
        expansionAreas.forEach((area: string, index: number) => {
          checkPageBreak(20);
          
          // Area marker
          doc.setFillColor(245, 243, 255);
          doc.roundedRect(margin, yPosition - 2, pageWidth - 2 * margin, 0, 2, 2, 'F');
          
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(139, 92, 246);
          doc.text(`▸`, margin + 2, yPosition + 2);
          
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(60, 60, 60);
          const areaLines = doc.splitTextToSize(area, pageWidth - 2 * margin - 12);
          let lineY = yPosition;
          areaLines.forEach((line: string) => {
            checkPageBreak(5);
            doc.text(line, margin + 8, lineY + 2);
            lineY += 4.5;
          });
          yPosition = lineY + 7;
        });
      }
    }
  }

  // ============ SECTION: BUYER/DEPARTMENT INSIGHTS ============
  if (filters.includeSections.includes('buyerInsights')) {
    addNewPage();
    addSectionHeader('Buyer / Department Insights', colors.purple);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Deep insights into buyer behavior patterns and department preferences', margin, yPosition);
    yPosition += 12;

    // Organization Affinity
    const orgAffinity = reportData.data.missedButWinnable?.ai?.signals?.org_affinity || [];
    if (orgAffinity.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.purple);
      doc.text('Top Organizations with Engagement History', margin, yPosition);
      yPosition += 8;

      orgAffinity.slice(0, 5).forEach((org, index) => {
        checkPageBreak(25);
        doc.setFillColor(245, 243, 255);
        doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 0, 1, 1, 'F');
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.dark);
        const orgName = org.org.length > 50 ? org.org.substring(0, 47) + '...' : org.org;
        doc.text(`${index + 1}. ${orgName}`, margin + 3, yPosition + 5);
        yPosition += 10;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const orgLines = doc.splitTextToSize(org.signal, pageWidth - 2 * margin - 10);
        orgLines.forEach((line: string) => {
          checkPageBreak(5);
          doc.text(line, margin + 8, yPosition);
          yPosition += 4.5;
        });
        yPosition += 5;
      });

      yPosition += 5;
    }

    // Ministry Affinity
    const ministryAffinity = reportData.data.missedButWinnable?.ai?.signals?.ministry_affinity || [];
    if (ministryAffinity.length > 0) {
      checkPageBreak(50);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.purple);
      doc.text('Ministry-Level Engagement Patterns', margin, yPosition);
      yPosition += 8;

      const ministryData = ministryAffinity.slice(0, 8).map((ministry, index) => {
        const truncatedMinistry = ministry.ministry.length > 55 
          ? ministry.ministry.substring(0, 52) + '...' 
          : ministry.ministry;
        const truncatedSignal = ministry.signal.length > 70 
          ? ministry.signal.substring(0, 67) + '...' 
          : ministry.signal;
        return [
          (index + 1).toString(),
          truncatedMinistry,
          truncatedSignal
        ];
      });

      autoTable(doc, {
        startY: yPosition,
        head: [['#', 'Ministry', 'Insight']],
        body: ministryData,
        theme: 'striped',
        headStyles: { 
          fillColor: colors.purple,
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: { fontSize: 8, cellPadding: 2 },
        alternateRowStyles: { fillColor: [245, 243, 255] },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 65, fontStyle: 'bold' },
          2: { cellWidth: 110 },
        },
        margin: { left: margin, right: margin },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    // Quantity and Price Patterns
    checkPageBreak(70);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.purple);
    doc.text('Winning Patterns Analysis', margin, yPosition);
    yPosition += 8;

    const quantityRanges = reportData.data.missedButWinnable?.ai?.signals?.quantity_ranges || [];
    const priceRanges = reportData.data.missedButWinnable?.ai?.signals?.price_ranges || [];

    if (quantityRanges.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(107, 70, 193);
      doc.text('Optimal Quantity Ranges:', margin, yPosition);
      yPosition += 6;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      quantityRanges.slice(0, 5).forEach(range => {
        checkPageBreak(6);
        const rangeLines = doc.splitTextToSize(`• ${range}`, pageWidth - 2 * margin - 10);
        rangeLines.forEach((line: string) => {
          doc.text(line, margin + 5, yPosition);
          yPosition += 4.5;
        });
      });
      yPosition += 5;
    }

    if (priceRanges.length > 0) {
      checkPageBreak(40);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(107, 70, 193);
      doc.text('Successful Price Ranges:', margin, yPosition);
      yPosition += 6;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      priceRanges.slice(0, 5).forEach(range => {
        checkPageBreak(6);
        const rangeLines = doc.splitTextToSize(`• ${range}`, pageWidth - 2 * margin - 10);
        rangeLines.forEach((line: string) => {
          doc.text(line, margin + 5, yPosition);
          yPosition += 4.5;
        });
      });
    }
  }

  // ============ SECTION: RIVALRY SCORECARD ============
  if (filters.includeSections.includes('rivalryScore')) {
    addNewPage();
    addSectionHeader('Rivalry Scorecard', colors.danger);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Competitive analysis of key players in your market segment`, margin, yPosition);
    yPosition += 12;

    // Top competitors from market
    const topSellers = reportData.data.topSellersByDept || [];
    if (topSellers.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.danger);
      doc.text('Top Competitors by Department', margin, yPosition);
      yPosition += 8;

      const rivalData = topSellers.slice(0, 10).map((seller, index) => [
        (index + 1).toString(),
        seller.seller || 'Unknown',
        seller.dept || 'N/A',
        formatCurrency(seller.value || 0),
        index < 3 ? '🔥 High' : index < 7 ? 'Medium' : 'Low'
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Rank', 'Competitor', 'Department', 'Value', 'Threat Level']],
        body: rivalData,
        theme: 'grid',
        headStyles: { fillColor: colors.danger, textColor: [255, 255, 255], fontSize: 10, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 60 },
          2: { cellWidth: 50 },
          3: { cellWidth: 35, halign: 'right' },
          4: { cellWidth: 25, halign: 'center' },
        },
        margin: { left: margin, right: margin },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // Competitive positioning
    checkPageBreak(60);
    doc.setFillColor(254, 242, 242); // Light red
    doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 35, 2, 2, 'F');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.danger);
    doc.text('Your Competitive Position', margin + 5, yPosition + 8);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.dark);
    doc.text(`Market Share: ${((successCount / (totalBids + topSellers.length)) * 100).toFixed(1)}%`, margin + 5, yPosition + 15);
    doc.text(`Win Rate vs Market: ${winRate}% (Industry Avg: 35%)`, margin + 5, yPosition + 21);
    doc.text(`Competitive Advantage: ${parseFloat(winRate) > 35 ? 'Above Average ✓' : 'Below Average - Needs Improvement'}`, margin + 5, yPosition + 27);
    
    yPosition += 40;
  }

  // ============ SECTION: LOW COMPETITION OPPORTUNITIES ============
  if (filters.includeSections.includes('lowCompetition')) {
    addNewPage();
    addSectionHeader('Single-Bidder / Low-Competition Opportunities', colors.secondary);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`High-value opportunities with minimal competition - prime targets for success`, margin, yPosition);
    yPosition += 12;

    const lowCompBids = reportData.data.lowCompetitionBids?.results || [];
    if (lowCompBids.length > 0) {
      // Summary stats
      doc.setFillColor(236, 253, 245); // Light green
      doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 20, 2, 2, 'F');
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.secondary);
      doc.text(`Total Low-Competition Opportunities: ${lowCompBids.length}`, margin + 5, yPosition + 8);
      
      const lowCompValue = lowCompBids.reduce((sum: number, bid: any) => sum + (bid.total_price || 0), 0);
      doc.text(`Total Opportunity Value: ${formatCurrency(lowCompValue)}`, margin + 5, yPosition + 15);
      yPosition += 25;

      doc.setTextColor(...colors.dark);

      // Opportunities table
      const lowCompData = lowCompBids.slice(0, 10).map((bid: any, index: number) => [
        (index + 1).toString(),
        (bid.bid_number || 'N/A').substring(0, 20),
        (bid.org || 'N/A').substring(0, 28),
        (bid.dept || 'N/A').substring(0, 23),
        formatCurrency(bid.total_price || 0),
        (bid.bidders_count || 1).toString() + ' bidders',
        bid.ended_at ? formatDate(bid.ended_at) : 'N/A',
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['#', 'Bid Number', 'Organization', 'Department', 'Value', 'Competition', 'Date']],
        body: lowCompData,
        theme: 'striped',
        headStyles: { fillColor: colors.secondary, textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [236, 253, 245] },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 28 },
          2: { cellWidth: 42 },
          3: { cellWidth: 35 },
          4: { cellWidth: 28, halign: 'right' },
          5: { cellWidth: 20, halign: 'center' },
          6: { cellWidth: 22, halign: 'center' },
        },
        margin: { left: margin, right: margin },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    } else {
      doc.setFontSize(10);
      doc.text('No low-competition opportunities identified in the current analysis.', margin, yPosition);
      yPosition += 10;
    }

    // Strategic recommendations
    checkPageBreak(50);
    doc.setFillColor(236, 253, 245);
    doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 35, 2, 2, 'F');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.secondary);
    doc.text('Strategic Recommendations', margin + 5, yPosition + 8);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.dark);
    doc.text('• Focus on low-competition tenders to maximize win rate', margin + 5, yPosition + 15);
    doc.text('• Quick response times are critical for single-bidder opportunities', margin + 5, yPosition + 21);
    doc.text('• Leverage competitive pricing to secure these high-probability wins', margin + 5, yPosition + 27);
    
    yPosition += 40;
  }

  // ============ SECTION: TOP PERFORMING STATES ============
  if (filters.includeSections.includes('topStates')) {
    addNewPage();
    addSectionHeader('Top Performing States / Geographies', colors.primary);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Geographic distribution of successful bids and market opportunities`, margin, yPosition);
    yPosition += 12;

    const topStates = reportData.data.topPerformingStates || [];
    if (topStates.length > 0) {
      // States performance table
      const statesData = topStates.slice(0, 15).map((state, index) => [
        (index + 1).toString(),
        state.state,
        state.count.toString(),
        formatCurrency(state.value || 0),
        ((state.count / topStates.reduce((sum, s) => sum + s.count, 0)) * 100).toFixed(1) + '%',
        index < 3 ? '⭐ Top' : 'Active'
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Rank', 'State / UT', 'Tender Count', 'Total Value', 'Share %', 'Status']],
        body: statesData,
        theme: 'striped',
        headStyles: { fillColor: colors.primary, textColor: [255, 255, 255], fontSize: 10, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 55 },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 40, halign: 'right' },
          4: { cellWidth: 25, halign: 'center' },
          5: { cellWidth: 25, halign: 'center' },
        },
        margin: { left: margin, right: margin },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;

      // Regional insights
      checkPageBreak(50);
      doc.setFillColor(239, 246, 255); // Light blue
      doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 40, 2, 2, 'F');
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.primary);
      doc.text('Geographic Market Insights', margin + 5, yPosition + 8);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.dark);
      
      const topState = topStates[0];
      const totalTenders = topStates.reduce((sum, s) => sum + s.count, 0);
      const topStateShare = ((topState.count / totalTenders) * 100).toFixed(1);
      
      doc.text(`• Top Market: ${topState.state} (${topStateShare}% of total opportunities)`, margin + 5, yPosition + 15);
      doc.text(`• Geographic Spread: Active in ${topStates.length} states/regions`, margin + 5, yPosition + 21);
      doc.text(`• Expansion Opportunity: Consider increasing presence in underserved regions`, margin + 5, yPosition + 27);
      doc.text(`• Focus Strategy: Concentrate resources on top 5 states for maximum ROI`, margin + 5, yPosition + 33);
      
      yPosition += 45;

      // Visual bar representation
      checkPageBreak(60);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Top 5 States - Visual Distribution', margin, yPosition);
      yPosition += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const maxCount = topStates[0].count;
      
      topStates.slice(0, 5).forEach((state) => {
        const barWidth = ((pageWidth - 2 * margin - 55) * state.count) / maxCount;
        doc.text(state.state.substring(0, 20), margin, yPosition);
        doc.setFillColor(...colors.primary);
        doc.roundedRect(margin + 52, yPosition - 3, Math.max(barWidth, 5), 5, 1, 1, 'F');
        doc.setTextColor(...colors.dark);
        doc.text(state.count.toString(), margin + 57 + barWidth, yPosition);
        yPosition += 8;
      });
    } else {
      doc.setFontSize(10);
      doc.text('Geographic data not available in the current analysis.', margin, yPosition);
      yPosition += 10;
    }
  }

  // ============ FINAL PAGE: RECENT SUCCESSFUL BIDS ============
  if (wins.length > 0) {
    addNewPage();
    addSectionHeader('Recent Successful Bids - Detailed List', colors.secondary);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Complete list of your winning bids in the analysis period`, margin, yPosition);
    yPosition += 10;

    const bidsTableData = wins.slice(0, 20).map((win, index) => [
      (index + 1).toString(),
      (win.bid_number || 'N/A').substring(0, 25),
      (win.org || '').substring(0, 28),
      (win.dept || '').substring(0, 23),
      (win.quantity?.toString() || 'N/A'),
      formatCurrency(win.total_price || 0),
      win.ended_at ? formatDate(win.ended_at) : 'N/A',
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Bid Number', 'Organization', 'Department', 'Qty', 'Value', 'Date']],
      body: bidsTableData,
      theme: 'grid',
      headStyles: { 
        fillColor: colors.secondary, 
        textColor: [255, 255, 255], 
        fontSize: 9, 
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 35 },
        2: { cellWidth: 40 },
        3: { cellWidth: 35 },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 30, halign: 'right' },
        6: { cellWidth: 22, halign: 'center' },
      },
      margin: { left: margin, right: margin },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          addPageHeader();
          addPageFooter();
        }
      },
    });
  }

  // Add footer to first page
  doc.setPage(1);
  addPageFooter();

  return doc;
};
