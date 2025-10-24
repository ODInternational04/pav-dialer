import jsPDF from 'jspdf'
import 'jspdf-autotable'

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

export interface ReportData {
  userStats: any[]
  systemStats: any
  detailedCallLogs: any[]
  clientInteractions: any[]
  dateRange: {
    startDate: string
    endDate: string
  }
  reportType: 'daily' | 'weekly' | 'monthly'
}

export class PDFReportGenerator {
  private doc: jsPDF
  private pageHeight: number
  private pageWidth: number
  private margin: number
  private currentY: number

  constructor() {
    this.doc = new jsPDF()
    this.pageHeight = this.doc.internal.pageSize.height
    this.pageWidth = this.doc.internal.pageSize.width
    this.margin = 20
    this.currentY = this.margin
  }

  generateReport(data: ReportData): void {
    this.addHeader(data)
    this.addSystemSummary(data.systemStats)
    this.addUserPerformance(data.userStats)
    this.addCallActivity(data.detailedCallLogs)
    this.addClientInteractions(data.clientInteractions)
    this.addFooter()
  }

  private addHeader(data: ReportData): void {
    // Company Header
    this.doc.setFontSize(24)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Dialer System', this.pageWidth / 2, this.currentY, { align: 'center' })
    
    this.currentY += 10
    this.doc.setFontSize(18)
    this.doc.setFont('helvetica', 'normal')
    
    let reportTitle = ''
    switch (data.reportType) {
      case 'daily':
        reportTitle = 'Daily Call Report'
        break
      case 'weekly':
        reportTitle = 'Weekly Call Report'
        break
      case 'monthly':
        reportTitle = 'Monthly Call Report'
        break
    }
    
    this.doc.text(reportTitle, this.pageWidth / 2, this.currentY, { align: 'center' })
    
    this.currentY += 8
    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'normal')
    
    const startDate = new Date(data.dateRange.startDate).toLocaleDateString()
    const endDate = new Date(data.dateRange.endDate).toLocaleDateString()
    this.doc.text(`Period: ${startDate} - ${endDate}`, this.pageWidth / 2, this.currentY, { align: 'center' })
    
    this.currentY += 8
    this.doc.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, this.pageWidth / 2, this.currentY, { align: 'center' })
    
    this.currentY += 15
    this.addSeparatorLine()
  }

  private addSystemSummary(systemStats: any): void {
    this.checkPageBreak(60)
    
    this.doc.setFontSize(16)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('System Overview', this.margin, this.currentY)
    this.currentY += 10
    
    const summaryData = [
      ['Total Calls', systemStats.total_calls || 0],
      ['Completed Calls', systemStats.completed_calls || 0],
      ['Success Rate', `${systemStats.overall_success_rate || 0}%`],
      ['Average Call Duration', `${Math.round(systemStats.average_call_duration || 0)} seconds`],
      ['Active Users', systemStats.active_users || 0],
      ['Pending Callbacks', systemStats.callbacks_pending || 0],
      ['Overdue Callbacks', systemStats.callbacks_overdue || 0]
    ]

    this.doc.autoTable({
      startY: this.currentY,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: this.margin, right: this.margin },
      tableWidth: 'auto',
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 60, halign: 'center' }
      }
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 15
  }

  private addUserPerformance(userStats: any[]): void {
    this.checkPageBreak(100)
    
    this.doc.setFontSize(16)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('User Performance Statistics', this.margin, this.currentY)
    this.currentY += 10

    if (!userStats || userStats.length === 0) {
      this.doc.setFontSize(12)
      this.doc.setFont('helvetica', 'normal')
      this.doc.text('No user data available for this period.', this.margin, this.currentY)
      this.currentY += 15
      return
    }

    const userData = userStats.map(user => [
      `${user.first_name} ${user.last_name}`,
      user.total_calls || 0,
      `${user.success_rate || 0}%`,
      `${Math.round(user.average_call_duration || 0)}s`,
      user.callbacks_requested || 0,
      `${user.completed_calls || 0}/${user.missed_calls || 0}/${user.declined_calls || 0}`
    ])

    this.doc.autoTable({
      startY: this.currentY,
      head: [['User', 'Total Calls', 'Success Rate', 'Avg Duration', 'Callbacks', 'C/M/D']],
      body: userData,
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94] },
      margin: { left: this.margin, right: this.margin },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 25, halign: 'center' },
        5: { cellWidth: 30, halign: 'center' }
      }
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 15
  }

  private addCallActivity(callLogs: any[]): void {
    this.checkPageBreak(100)
    
    this.doc.setFontSize(16)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Recent Call Activity', this.margin, this.currentY)
    this.currentY += 10

    if (!callLogs || callLogs.length === 0) {
      this.doc.setFontSize(12)
      this.doc.setFont('helvetica', 'normal')
      this.doc.text('No call activity for this period.', this.margin, this.currentY)
      this.currentY += 15
      return
    }

    // Limit to most recent 20 calls for PDF
    const recentCalls = callLogs.slice(0, 20)
    
    const callData = recentCalls.map(call => [
      new Date(call.created_at).toLocaleDateString(),
      `${call.users?.first_name || ''} ${call.users?.last_name || ''}`.trim() || 'Unknown',
      call.clients?.principal_key_holder || 'Unknown',
      call.call_status || 'Unknown',
      call.call_duration ? `${Math.floor(call.call_duration / 60)}:${(call.call_duration % 60).toString().padStart(2, '0')}` : 'N/A',
      call.callback_requested ? 'Yes' : 'No'
    ])

    this.doc.autoTable({
      startY: this.currentY,
      head: [['Date', 'User', 'Client', 'Status', 'Duration', 'Callback']],
      body: callData,
      theme: 'striped',
      headStyles: { fillColor: [168, 85, 247] },
      margin: { left: this.margin, right: this.margin },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 35 },
        2: { cellWidth: 40 },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 20, halign: 'center' }
      }
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 15
  }

  private addClientInteractions(clientInteractions: any[]): void {
    this.checkPageBreak(100)
    
    this.doc.setFontSize(16)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Most Contacted Clients', this.margin, this.currentY)
    this.currentY += 10

    if (!clientInteractions || clientInteractions.length === 0) {
      this.doc.setFontSize(12)
      this.doc.setFont('helvetica', 'normal')
      this.doc.text('No client interaction data available.', this.margin, this.currentY)
      this.currentY += 15
      return
    }

    // Limit to top 10 clients for PDF
    const topClients = clientInteractions.slice(0, 10)
    
    const clientData = topClients.map(client => [
      client.client?.principal_key_holder || 'Unknown',
      client.client?.box_number || 'N/A',
      client.totalCalls || 0,
      new Date(client.lastCall).toLocaleDateString(),
      client.lastCalledBy ? `${client.lastCalledBy.first_name} ${client.lastCalledBy.last_name}` : 'Unknown',
      `${client.callsByStatus?.completed || 0}/${client.callsByStatus?.missed || 0}/${client.callsByStatus?.declined || 0}`
    ])

    this.doc.autoTable({
      startY: this.currentY,
      head: [['Client Name', 'Box #', 'Total Calls', 'Last Contact', 'Last Called By', 'C/M/D']],
      body: clientData,
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11] },
      margin: { left: this.margin, right: this.margin },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 25 },
        4: { cellWidth: 35 },
        5: { cellWidth: 25, halign: 'center' }
      }
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 15
  }

  private addFooter(): void {
    const pageCount = this.doc.getNumberOfPages()
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i)
      this.doc.setFontSize(10)
      this.doc.setFont('helvetica', 'normal')
      
      // Footer text
      this.doc.text(
        'Generated by Dialer System - Confidential Report',
        this.pageWidth / 2,
        this.pageHeight - 15,
        { align: 'center' }
      )
      
      // Page number
      this.doc.text(
        `Page ${i} of ${pageCount}`,
        this.pageWidth - this.margin,
        this.pageHeight - 15,
        { align: 'right' }
      )
    }
  }

  private addSeparatorLine(): void {
    this.doc.setDrawColor(200, 200, 200)
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY)
    this.currentY += 5
  }

  private checkPageBreak(requiredSpace: number): void {
    if (this.currentY + requiredSpace > this.pageHeight - 30) {
      this.doc.addPage()
      this.currentY = this.margin
    }
  }

  save(filename: string): void {
    this.doc.save(filename)
  }

  output(): string {
    return this.doc.output('datauristring')
  }
}