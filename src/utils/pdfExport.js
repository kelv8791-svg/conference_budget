import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Shared PDF generation utility for conference budgets.
 * 
 * @param {Object} budget - The budget data object.
 * @param {Object} options - Export options (isEmail, etc).
 */
export const generateBudgetPDF = async (budget, options = {}) => {
  const { isEmail = false } = options;
  
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Helper to load image
    const loadImage = (url) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      });
    };

    let logoData = null;
    try {
      logoData = await loadImage('/logo.jpg');
    } catch {
      console.warn("Logo not found, skipping...");
    }

    // 1. Header & Branding (Centered)
    let currentY = 15;
    if (logoData) {
      const logoWidth = 15;
      const logoHeight = (logoData.height * logoWidth) / logoData.width;
      doc.addImage(logoData, 'JPEG', (pageWidth - logoWidth) / 2, currentY, logoWidth, logoHeight);
      currentY += logoHeight + 8;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0);
    doc.text("Epashikino Resort & Spa", pageWidth / 2, currentY, { align: "center" });
    currentY += 10;
    
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text(`${budget.orgName || 'N/A'} Conference Budget`, pageWidth / 2, currentY, { align: "center" });
    currentY += 15;

    // 2. Event Details (Arranged neatly)
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");

    const detailLeft = 14;
    const detailRight = 110;

    const safeDates = budget.dates || budget.displayDates || 'N/A';

    doc.text(`Organization: ${budget.orgName || 'N/A'}`, detailLeft, currentY);
    doc.text(`Estimated PAX: ${budget.pax || 0}`, detailRight, currentY);
    currentY += 6;
    doc.text(`Workshop Dates: ${safeDates}`, detailLeft, currentY);
    doc.text(`Duration: ${budget.days || 1} Days`, detailRight, currentY);
    currentY += 6;
    doc.text(`Group Type: ${budget.groupType || 'Conference'}`, detailLeft, currentY);
    doc.text(`Rate/PAX: KES ${Number(budget.conferenceRate || 0).toLocaleString()}`, detailRight, currentY);
    currentY += 12;

    // 3. Table Items Construction
    const tableColumn = ["Category", "Item Name", "Unit", "Base Price", "Qty", "Total (KES)"];
    const tableRows = [];

    const grouped = (budget.items || []).reduce((acc, item) => {
      if (!acc[item.cat]) acc[item.cat] = [];
      acc[item.cat].push(item);
      return acc;
    }, {});

    Object.entries(grouped).forEach(([cat, items]) => {
      let catTotal = 0;
      items.forEach(item => {
        const qty = Number(item.budgetQty || 0);
        const price = Number(item.price || 0);
        const itemTotal = price * qty;
        catTotal += itemTotal;
        tableRows.push([
          item.cat || 'N/A', 
          item.name || 'N/A', 
          item.unit || 'PCS', 
          price.toLocaleString(),
          qty.toString(), 
          itemTotal.toLocaleString(undefined, {minimumFractionDigits:2})
        ]);
      });
      tableRows.push([
        { content: `${cat} SUBTOTAL:`, colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fillColor: [255, 235, 235], textColor: [0, 0, 0] } },
        { content: `KES ${catTotal.toLocaleString(undefined, {minimumFractionDigits:2})}`, styles: { fontStyle: 'bold', fillColor: [255, 235, 235], textColor: [0, 0, 0] } }
      ]);
    });

    // 4. Generate Table
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: currentY,
      theme: 'grid',
      styles: { 
        fontSize: 8, 
        cellPadding: 3, 
        lineColor: [101, 67, 33], // Dark brown
        lineWidth: 0.1,
        textColor: [0, 0, 0] 
      },
      headStyles: { 
        fillColor: [0, 0, 0], // Black header
        textColor: [255, 255, 255], 
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [252, 252, 252]
      }
    });

    // 5. Summary Totals (Bottom - where table ends)
    const finalY = doc.lastAutoTable.finalY + 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    
    const summaryX = pageWidth - 105;
    const valueX = pageWidth - 14;

    const totalWorkshopAmount = Number(budget.totalWorkshopAmount || 0);
    const targetFoodCost = Number(budget.targetFoodCost || 0);
    const currentCost = Number(budget.totalCost || budget.currentCost || 0);

    doc.text(`Total Workshop Revenue:`, summaryX, finalY);
    doc.text(`KES ${totalWorkshopAmount.toLocaleString(undefined, {minimumFractionDigits:2})}`, valueX, finalY, { align: 'right' });
    
    doc.text(`Food Cost Allowance (25%):`, summaryX, finalY + 7);
    doc.text(`KES ${targetFoodCost.toLocaleString(undefined, {minimumFractionDigits:2})}`, valueX, finalY + 7, { align: 'right' });
    
    const currentPercentage = totalWorkshopAmount > 0 ? (currentCost / totalWorkshopAmount) * 100 : 0;
    if (currentCost > targetFoodCost) doc.setTextColor(200, 0, 0); 
    doc.text(`Actual Estimated Cost (${currentPercentage.toFixed(1)}%):`, summaryX, finalY + 14);
    doc.text(`KES ${currentCost.toLocaleString(undefined, {minimumFractionDigits:2})}`, valueX, finalY + 14, { align: 'right' });

    const safeFileName = (budget.orgName || budget.groupType || 'Budget').replace(/[^a-z0-9]/gi, '_');
    const filename = `Budget_${safeFileName}.pdf`;

    if (isEmail) {
      doc.save(filename);
      const subject = encodeURIComponent(`Conference Stock Budget: ${budget.orgName}`);
      const body = encodeURIComponent(`Hello,\n\nPlease find attached the budget for ${budget.orgName}.\n\n(Note: Please attach the downloaded file '${filename}' manually to this email).`);
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
      alert(`PDF '${filename}' downloaded. Please attach it to the email that just opened.`);
    } else {
      doc.save(filename);
    }
  } catch (err) {
    console.error("PDF Export Error:", err);
    alert(`Failed to generate PDF: ${err.message}`);
  }
};
