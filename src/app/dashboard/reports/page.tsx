'use client'

import React, { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import { loadJsPDFWithAutoTable, createSimplePDF } from '@/lib/pdfUtils'
import { 
  ChartBarIcon,
  UserGroupIcon,
  PhoneIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  DocumentArrowDownIcon,
  DocumentIcon
} from '@heroicons/react/24/outline'

interface UserStats {
  user_id: string
  first_name: string
  last_name: string
  email: string
  total_calls: number
  completed_calls: number
  missed_calls: number
  declined_calls: number
  success_rate: number
  average_call_duration: number
  callbacks_requested: number
  total_call_time: number
}

interface SystemStats {
  total_calls: number
  completed_calls: number
  overall_success_rate: number
  average_call_duration: number
  total_users: number
  active_users: number
  callbacks_pending: number
  callbacks_overdue: number
}

interface ReportData {
  userStats: UserStats[]
  systemStats: SystemStats
  callVolumeByDate: any[]
  detailedCallLogs: any[]
  topUsers: any[]
  callbackStats: any
  clientInteractions: any[]
  reportType: 'daily' | 'weekly' | 'monthly'
  dateRange: {
    startDate: string
    endDate: string
  }
}

export default function AdminReportsPage() {
  const { user, isAdmin } = useAuth()
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('monthly')
  const [specificDate, setSpecificDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [allUsers, setAllUsers] = useState<any[]>([])

  // Fetch all users for the filter dropdown
  const fetchAllUsers = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/users?limit=100', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log('All users API response:', data)
        // The API returns { users: [...] }, so we need to extract the users array
        const users = data.users || []
        console.log('Extracted users:', users)
        setAllUsers(users)
      } else {
        console.error('Failed to fetch users')
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }, [])

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const params = new URLSearchParams({
        reportType: reportType,
        ...(reportType === 'daily' && specificDate && { date: specificDate }),
        ...(selectedUserId && { userId: selectedUserId })
      })

      console.log('Fetching reports with params:', {
        reportType,
        specificDate,
        selectedUserId,
        queryString: params.toString()
      })

      const response = await fetch(`/api/reports?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Reports data received:', data)
        console.log('User stats:', data.userStats)
        console.log('Detailed call logs count:', data.detailedCallLogs?.length)
        console.log('Client interactions count:', data.clientInteractions?.length)
        console.log('Applied filters - userId:', selectedUserId)
        setReportData(data)
      } else {
        console.error('Failed to fetch reports')
      }
    } catch (error) {
      console.error('Error fetching reports:', error)
    } finally {
      setLoading(false)
    }
  }, [reportType, specificDate, selectedUserId])

  useEffect(() => {
    if (user && isAdmin) {
      fetchAllUsers()
      fetchReports()
    }
  }, [user, isAdmin, fetchAllUsers, fetchReports])

  const testPDFGeneration = async () => {
    try {
      console.log('Testing basic PDF generation...')
      
      // Try the utility function first
      try {
        const { jsPDF, doc } = await loadJsPDFWithAutoTable()
        console.log('jsPDF with autoTable loaded successfully')
        
        // Add title
        doc.setFontSize(20)
        doc.text('Dialer System Test Report', 20, 20)
        
        // Add some content
        doc.setFontSize(12)
        doc.text('This is a test PDF to verify the PDF generation functionality.', 20, 40)
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 60)
        
        // Check if autoTable is available
        if (typeof (doc as any).autoTable === 'function') {
          console.log('autoTable function is available')
          
          // Add a simple table
          ;(doc as any).autoTable({
            startY: 80,
            head: [['Test Item', 'Status']],
            body: [
              ['PDF Generation', 'Working'],
              ['jsPDF Library', 'Loaded'],
              ['AutoTable Plugin', 'Loaded']
            ],
            theme: 'grid'
          })
        } else {
          console.error('autoTable function not available')
          
          // Fallback: add text instead of table
          doc.text('Test Items:', 20, 80)
          doc.text('- PDF Generation: Working', 20, 100)
          doc.text('- jsPDF Library: Loaded', 20, 120)
          doc.text('- AutoTable Plugin: Not Available', 20, 140)
        }
        
        // Save the PDF
        doc.save('test-report.pdf')
        console.log('Test PDF generated and downloaded successfully!')
        alert('Test PDF generated successfully! Check your downloads folder.')
        
      } catch (autoTableError) {
        console.warn('AutoTable approach failed, trying simple PDF:', autoTableError)
        
        // Fallback to enhanced simple PDF without autoTable
        const doc = await createSimplePDF()
        
        // Set up enhanced color palette (same as main version)
        const primaryColor = [37, 99, 235] // Rich Blue
        const accentColor = [16, 185, 129] // Emerald
        const successColor = [22, 163, 74] // Green
        const warningColor = [234, 179, 8] // Amber
        const dangerColor = [220, 38, 38] // Red
        const darkColor = [15, 23, 42] // Slate 900
        const lightColor = [241, 245, 249] // Slate 100
        const whiteColor = [255, 255, 255]
        
        // Modern gradient header
        const pageWidth = doc.internal.pageSize.width
        
        // Background gradient effect
        for (let i = 0; i < 50; i++) {
          const opacity = 1 - (i / 50)
          doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
          doc.setGState(doc.GState({ opacity: opacity }))
          doc.rect(0, i, pageWidth, 1, 'F')
        }
        
        // Reset opacity and create main header
        doc.setGState(doc.GState({ opacity: 1 }))
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
        doc.rect(0, 0, pageWidth, 50, 'F')
        
        // Accent stripe
        doc.setFillColor(accentColor[0], accentColor[1], accentColor[2])
        doc.rect(0, 0, pageWidth, 3, 'F')
        
        // Company logo simulation
        doc.setFillColor(whiteColor[0], whiteColor[1], whiteColor[2])
        doc.circle(25, 25, 10, 'F')
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
        doc.circle(25, 25, 6, 'F')
        
        // Enhanced title
        doc.setTextColor(whiteColor[0], whiteColor[1], whiteColor[2])
        doc.setFontSize(28)
        doc.setFont('helvetica', 'bold')
        doc.text('DIALER SYSTEM', pageWidth / 2, 20, { align: 'center' })
        
        doc.setFontSize(16)
        doc.setFont('helvetica', 'normal')
        doc.text('Enhanced Test Report', pageWidth / 2, 32, { align: 'center' })
        
        // Decorative line
        doc.setLineWidth(1)
        doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2])
        doc.line(40, 40, pageWidth - 40, 40)
        
        // Reset text color for content
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2])
        
        // Enhanced content with better spacing and styling
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Test Report Results', 20, 70)
        
        doc.setFontSize(12)
        doc.setFont('helvetica', 'normal')
        doc.text('This enhanced PDF demonstrates improved aesthetic design capabilities.', 20, 85)
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 100)
        
        // Create professional test results section
        doc.setFillColor(lightColor[0], lightColor[1], lightColor[2])
        doc.rect(15, 115, pageWidth - 30, 80, 'F')
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2])
        doc.setLineWidth(1)
        doc.rect(15, 115, pageWidth - 30, 80, 'S')
        
        // Section header
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
        doc.rect(15, 115, pageWidth - 30, 20, 'F')
        doc.setTextColor(whiteColor[0], whiteColor[1], whiteColor[2])
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('📊 System Test Results', 20, 128)
        
        // Test results with enhanced styling
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2])
        doc.setFontSize(12)
        doc.setFont('helvetica', 'normal')
        
        // Success items
        doc.setTextColor(successColor[0], successColor[1], successColor[2])
        doc.setFont('helvetica', 'bold')
        doc.text('✓ PDF Generation Framework:', 25, 150)
        doc.setFont('helvetica', 'normal')
        doc.text('Fully operational', 120, 150)
        
        doc.setFont('helvetica', 'bold')
        doc.text('✓ jsPDF Library:', 25, 165)
        doc.setFont('helvetica', 'normal')
        doc.text('Successfully loaded', 120, 165)
        
        // Warning item
        doc.setTextColor(warningColor[0], warningColor[1], warningColor[2])
        doc.setFont('helvetica', 'bold')
        doc.text('⚠ AutoTable Plugin:', 25, 180)
        doc.setFont('helvetica', 'normal')
        doc.text('Using fallback mode', 120, 180)
        
        // Professional footer
        doc.setFillColor(darkColor[0], darkColor[1], darkColor[2])
        doc.rect(0, 270, pageWidth, 25, 'F')
        
        doc.setFillColor(accentColor[0], accentColor[1], accentColor[2])
        doc.rect(0, 270, pageWidth, 2, 'F')
        
        doc.setTextColor(whiteColor[0], whiteColor[1], whiteColor[2])
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('DIALER SYSTEM', 20, 283)
        
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.text('© 2025 • Enhanced Test Report', 20, 289)
        
        doc.text('Page 1 of 1', pageWidth - 20, 283, { align: 'right' })
        
        // Save the enhanced PDF
        doc.save('enhanced-test-report.pdf')
        console.log('Enhanced test PDF generated and downloaded successfully!')
        alert('Enhanced test PDF generated successfully! AutoTable not available, but modern design implemented with comprehensive styling and professional layout.')
      }
      
    } catch (error) {
      console.error('Test PDF generation failed:', error)
      alert(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const generatePDFReport = async () => {
    if (!reportData) {
      alert('No report data available. Please refresh the report first.')
      return
    }

    try {
      setIsGeneratingPDF(true)
      console.log('Starting PDF generation...')
      
      // Try to load jsPDF with autoTable, fallback to simple PDF if needed
      let doc: any
      let hasAutoTable = false
      
      try {
        const result = await loadJsPDFWithAutoTable()
        doc = result.doc
        hasAutoTable = typeof (doc as any).autoTable === 'function'
        console.log('jsPDF loaded with autoTable support:', hasAutoTable)
      } catch (error) {
        console.warn('AutoTable loading failed, using simple PDF:', error)
        doc = await createSimplePDF()
        hasAutoTable = false
      }
      
      let currentY = 20
      
      // Define enhanced color palette for professional design
      const colors = {
        primary: [37, 99, 235],       // Rich Blue
        primaryLight: [147, 197, 253], // Light Blue
        primaryDark: [29, 78, 216],   // Dark Blue
        secondary: [71, 85, 105],     // Slate Gray
        secondaryLight: [148, 163, 184], // Light Slate
        accent: [16, 185, 129],       // Emerald
        accentLight: [167, 243, 208], // Light Emerald
        success: [22, 163, 74],       // Green
        successLight: [187, 247, 208], // Light Green
        warning: [234, 179, 8],       // Amber
        warningLight: [254, 240, 138], // Light Amber
        danger: [220, 38, 38],        // Red
        dangerLight: [252, 165, 165], // Light Red
        dark: [15, 23, 42],           // Slate 900
        darkLight: [30, 41, 59],      // Slate 800
        gray: [100, 116, 139],        // Slate 500
        grayLight: [203, 213, 225],   // Slate 300
        light: [241, 245, 249],       // Slate 100
        lightest: [248, 250, 252],    // Slate 50
        white: [255, 255, 255],
        background: [249, 250, 251],  // Gray 50
        cardBg: [255, 255, 255],      // White
        borderColor: [229, 231, 235], // Gray 200
        textPrimary: [17, 24, 39],    // Gray 900
        textSecondary: [75, 85, 99],  // Gray 600
        textMuted: [156, 163, 175]    // Gray 400
      }
      
      // Create modern gradient header with shadow effect
      const pageWidth = doc.internal.pageSize.width
      const pageHeight = doc.internal.pageSize.height
      
      // Background gradient effect (simulated with multiple rectangles)
      for (let i = 0; i < 60; i++) {
        const opacity = 1 - (i / 60)
        const blueValue = colors.primary[2] + (i * 2)
        doc.setFillColor(colors.primary[0], colors.primary[1], Math.min(blueValue, 255))
        doc.setGState(doc.GState({ opacity: opacity }))
        doc.rect(0, i, pageWidth, 1, 'F')
      }
      
      // Reset opacity
      doc.setGState(doc.GState({ opacity: 1 }))
      
      // Main header background
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2])
      doc.rect(0, 0, pageWidth, 60, 'F')
      
      // Add subtle top border accent
      doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2])
      doc.rect(0, 0, pageWidth, 4, 'F')
      
      // Company logo area (simulated with geometric shapes)
      doc.setFillColor(colors.white[0], colors.white[1], colors.white[2])
      doc.circle(30, 30, 12, 'F')
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2])
      doc.circle(30, 30, 8, 'F')
      
      // Main title with enhanced typography
      doc.setTextColor(colors.white[0], colors.white[1], colors.white[2])
      doc.setFontSize(32)
      doc.setFont('helvetica', 'bold')
      doc.text('DIALER SYSTEM', pageWidth / 2, 25, { align: 'center' })
      
      // Subtitle with professional styling
      doc.setFontSize(18)
      doc.setFont('helvetica', 'normal')
      const reportTitle = `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Performance Report`
      doc.text(reportTitle, pageWidth / 2, 40, { align: 'center' })
      
      // Add decorative line
      doc.setLineWidth(1)
      doc.setDrawColor(colors.accent[0], colors.accent[1], colors.accent[2])
      doc.line(50, 48, pageWidth - 50, 48)
      
      // Professional date and metadata section
      doc.setTextColor(colors.textPrimary[0], colors.textPrimary[1], colors.textPrimary[2])
      currentY = 80
      
      // Create metadata box with shadow effect
      doc.setFillColor(colors.grayLight[0], colors.grayLight[1], colors.grayLight[2])
      doc.rect(22, currentY - 5, pageWidth - 44, 35, 'F') // Shadow
      doc.setFillColor(colors.cardBg[0], colors.cardBg[1], colors.cardBg[2])
      doc.rect(20, currentY - 7, pageWidth - 40, 35, 'F') // Main box
      doc.setDrawColor(colors.borderColor[0], colors.borderColor[1], colors.borderColor[2])
      doc.setLineWidth(0.5)
      doc.rect(20, currentY - 7, pageWidth - 40, 35, 'S')
      
      // Date information with icons (using Unicode symbols)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(colors.textPrimary[0], colors.textPrimary[1], colors.textPrimary[2])
      
      const startDate = new Date(reportData.dateRange.startDate).toLocaleDateString('en-US', { 
        year: 'numeric', month: 'long', day: 'numeric' 
      })
      const endDate = new Date(reportData.dateRange.endDate).toLocaleDateString('en-US', { 
        year: 'numeric', month: 'long', day: 'numeric' 
      })
      
      doc.text('📅 Report Period:', 30, currentY + 5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(colors.textSecondary[0], colors.textSecondary[1], colors.textSecondary[2])
      doc.text(`${startDate} - ${endDate}`, 85, currentY + 5)
      
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(colors.textPrimary[0], colors.textPrimary[1], colors.textPrimary[2])
      doc.text('🕐 Generated:', 30, currentY + 15)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(colors.textSecondary[0], colors.textSecondary[1], colors.textSecondary[2])
      doc.text(new Date().toLocaleString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', 
        hour: '2-digit', minute: '2-digit'
      }), 85, currentY + 15)
      
      currentY += 50
      
      // SYSTEM OVERVIEW SECTION with modern card design
      // Section header with gradient background
      const sectionY = currentY
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2])
      doc.rect(20, sectionY - 8, pageWidth - 40, 24, 'F')
      
      // Add accent stripe
      doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2])
      doc.rect(20, sectionY - 8, 6, 24, 'F')
      
      // Section title
      doc.setTextColor(colors.white[0], colors.white[1], colors.white[2])
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('📊 SYSTEM PERFORMANCE OVERVIEW', 35, sectionY + 4)
      
      // Reset text color
      doc.setTextColor(colors.textPrimary[0], colors.textPrimary[1], colors.textPrimary[2])
      currentY += 35
      
      const systemStats = reportData.systemStats
      const summaryData = [
        ['Total Calls', systemStats.total_calls || 0, 'primary'],
        ['Completed Calls', systemStats.completed_calls || 0, 'success'],
        ['Success Rate', `${systemStats.overall_success_rate || 0}%`, 'success'],
        ['Average Call Duration', `${Math.round(systemStats.average_call_duration || 0)} seconds`, 'primary'],
        ['Active Users', systemStats.active_users || 0, 'accent'],
        ['Pending Callbacks', systemStats.callbacks_pending || 0, 'warning'],
        ['Overdue Callbacks', systemStats.callbacks_overdue || 0, 'danger']
      ]

      // Check if autoTable is available for enhanced table styling
      if (hasAutoTable && typeof (doc as any).autoTable === 'function') {
        ;(doc as any).autoTable({
          startY: currentY,
          head: [['Performance Metric', 'Value']],
          body: summaryData.map(row => [row[0], row[1]]),
          theme: 'grid',
          headStyles: { 
            fillColor: colors.primary,
            textColor: colors.white,
            fontStyle: 'bold',
            fontSize: 13,
            cellPadding: { top: 8, bottom: 8, left: 12, right: 12 },
            halign: 'center'
          },
          bodyStyles: {
            fontSize: 12,
            cellPadding: { top: 6, bottom: 6, left: 12, right: 12 }
          },
          alternateRowStyles: {
            fillColor: colors.lightest
          },
          columnStyles: {
            0: { 
              cellWidth: 120, 
              fontStyle: 'bold',
              textColor: colors.textPrimary,
              fillColor: colors.light
            },
            1: { 
              cellWidth: 80, 
              halign: 'center', 
              fontStyle: 'bold',
              textColor: colors.primary
            }
          },
          margin: { left: 25, right: 25 },
          styles: {
            lineColor: colors.borderColor,
            lineWidth: 0.5
          }
        })
        
        currentY = (doc as any).lastAutoTable.finalY + 25
      } else {
        // Enhanced fallback with beautiful metric cards
        const cardWidth = (pageWidth - 80) / 2
        const cardHeight = 35
        const spacing = 15
        
        summaryData.forEach((row, index) => {
          const isLeftColumn = index % 2 === 0
          const rowIndex = Math.floor(index / 2)
          const x = isLeftColumn ? 25 : 25 + cardWidth + spacing
          const y = currentY + (rowIndex * (cardHeight + 10))
          
          // Card shadow
          doc.setFillColor(colors.grayLight[0], colors.grayLight[1], colors.grayLight[2])
          doc.rect(x + 2, y + 2, cardWidth, cardHeight, 'F')
          
          // Main card
          doc.setFillColor(colors.cardBg[0], colors.cardBg[1], colors.cardBg[2])
          doc.rect(x, y, cardWidth, cardHeight, 'F')
          
          // Card border with color coding
          const colorType = row[2] as string
          let borderColor = colors.primary
          if (colorType === 'success') borderColor = colors.success
          else if (colorType === 'warning') borderColor = colors.warning
          else if (colorType === 'danger') borderColor = colors.danger
          else if (colorType === 'accent') borderColor = colors.accent
          
          doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2])
          doc.setLineWidth(2)
          doc.rect(x, y, cardWidth, cardHeight, 'S')
          
          // Left accent bar
          doc.setFillColor(borderColor[0], borderColor[1], borderColor[2])
          doc.rect(x, y, 4, cardHeight, 'F')
          
          // Metric name
          doc.setFontSize(11)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(colors.textPrimary[0], colors.textPrimary[1], colors.textPrimary[2])
          doc.text(`${row[0]}:`, x + 8, y + 12)
          
          // Value with color coding
          doc.setFontSize(16)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(borderColor[0], borderColor[1], borderColor[2])
          doc.text(`${row[1]}`, x + 8, y + 25)
        })
        
        const totalRows = Math.ceil(summaryData.length / 2)
        currentY += totalRows * (cardHeight + 10) + 15
      }
      
      // USER PERFORMANCE SECTION with enhanced design
      if (reportData.userStats && reportData.userStats.length > 0) {
        // Add page break if needed
        if (currentY > 200) {
          doc.addPage()
          currentY = 30
        }
        
        // Modern section header with gradient
        doc.setFillColor(colors.success[0], colors.success[1], colors.success[2])
        doc.rect(20, currentY - 8, pageWidth - 40, 24, 'F')
        
        // Add accent stripe
        doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2])
        doc.rect(20, currentY - 8, 6, 24, 'F')
        
        doc.setTextColor(colors.white[0], colors.white[1], colors.white[2])
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.text('👥 USER PERFORMANCE ANALYTICS', 35, currentY + 4)
        
        // Reset text color
        doc.setTextColor(colors.textPrimary[0], colors.textPrimary[1], colors.textPrimary[2])
        currentY += 35
        
        // User count with styled background
        doc.setFillColor(colors.successLight[0], colors.successLight[1], colors.successLight[2])
        doc.rect(25, currentY - 5, pageWidth - 50, 18, 'F')
        doc.setDrawColor(colors.success[0], colors.success[1], colors.success[2])
        doc.setLineWidth(0.5)
        doc.rect(25, currentY - 5, pageWidth - 50, 18, 'S')
        
        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(colors.success[0], colors.success[1], colors.success[2])
        doc.text(`📈 Performance data for ${reportData.userStats.length} active user(s)`, 30, currentY + 5)
        currentY += 25
        
        const userData = reportData.userStats.slice(0, 10).map(user => [
          `${user.first_name || 'Unknown'} ${user.last_name || 'User'}`,
          user.total_calls || 0,
          `${user.success_rate || 0}%`,
          `${Math.round(user.average_call_duration || 0)}s`,
          user.callbacks_requested || 0
        ])

        if (hasAutoTable && typeof (doc as any).autoTable === 'function') {
          ;(doc as any).autoTable({
            startY: currentY,
            head: [['User Name', 'Total Calls', 'Success Rate', 'Avg Duration', 'Callbacks']],
            body: userData,
            theme: 'grid',
            headStyles: { 
              fillColor: colors.success,
              textColor: colors.white,
              fontStyle: 'bold',
              fontSize: 12,
              cellPadding: { top: 8, bottom: 8, left: 8, right: 8 },
              halign: 'center'
            },
            bodyStyles: {
              fontSize: 11,
              cellPadding: { top: 6, bottom: 6, left: 8, right: 8 }
            },
            alternateRowStyles: {
              fillColor: colors.successLight
            },
            columnStyles: {
              0: { 
                cellWidth: 70, 
                fontStyle: 'bold',
                textColor: colors.textPrimary
              },
              1: { cellWidth: 30, halign: 'center', textColor: colors.primary },
              2: { cellWidth: 30, halign: 'center', textColor: colors.success },
              3: { cellWidth: 30, halign: 'center', textColor: colors.warning },
              4: { cellWidth: 30, halign: 'center', textColor: colors.accent }
            },
            margin: { left: 25, right: 25 },
            styles: {
              lineColor: colors.borderColor,
              lineWidth: 0.5
            }
          })
          
          currentY = (doc as any).lastAutoTable.finalY + 25
        } else {
          // Enhanced user cards with modern design
          userData.forEach((user, index) => {
            const cardY = currentY + (index * 32)
            
            // Card shadow
            doc.setFillColor(colors.grayLight[0], colors.grayLight[1], colors.grayLight[2])
            doc.rect(27, cardY + 2, pageWidth - 54, 28, 'F')
            
            // Main card
            doc.setFillColor(colors.cardBg[0], colors.cardBg[1], colors.cardBg[2])
            doc.rect(25, cardY, pageWidth - 50, 28, 'F')
            
            // Success rate based border color
            const successRateStr = String(user[2])
            const successRate = parseFloat(successRateStr.replace('%', ''))
            let borderColor = colors.success
            if (successRate < 50) borderColor = colors.danger
            else if (successRate < 75) borderColor = colors.warning
            
            doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2])
            doc.setLineWidth(1.5)
            doc.rect(25, cardY, pageWidth - 50, 28, 'S')
            
            // Left performance indicator
            doc.setFillColor(borderColor[0], borderColor[1], borderColor[2])
            doc.rect(25, cardY, 5, 28, 'F')
            
            // User name (larger, bold)
            doc.setFontSize(13)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(colors.textPrimary[0], colors.textPrimary[1], colors.textPrimary[2])
            doc.text(`${user[0]}`, 35, cardY + 10)
            
            // Performance metrics in organized layout
            doc.setFontSize(10)
            doc.setFont('helvetica', 'normal')
            
            // Calls
            doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
            doc.text(`📞 ${user[1]} calls`, 35, cardY + 20)
            
            // Success rate
            doc.setTextColor(borderColor[0], borderColor[1], borderColor[2])
            doc.text(`✓ ${user[2]}`, 90, cardY + 20)
            
            // Average duration
            doc.setTextColor(colors.warning[0], colors.warning[1], colors.warning[2])
            doc.text(`⏱ ${user[3]}`, 130, cardY + 20)
            
            // Callbacks
            doc.setTextColor(colors.accent[0], colors.accent[1], colors.accent[2])
            doc.text(`📋 ${user[4]} callbacks`, 165, cardY + 20)
          })
          
          currentY += userData.length * 32 + 15
        }
      } else {
        // Enhanced "no data" section
        if (currentY > 220) {
          doc.addPage()
          currentY = 30
        }
        
        // Section header with warning theme
        doc.setFillColor(colors.warning[0], colors.warning[1], colors.warning[2])
        doc.rect(20, currentY - 8, pageWidth - 40, 24, 'F')
        
        doc.setTextColor(colors.white[0], colors.white[1], colors.white[2])
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.text('👥 USER PERFORMANCE ANALYTICS', 35, currentY + 4)
        
        doc.setTextColor(colors.textPrimary[0], colors.textPrimary[1], colors.textPrimary[2])
        currentY += 35
        
        // Informative message card
        doc.setFillColor(colors.warningLight[0], colors.warningLight[1], colors.warningLight[2])
        doc.rect(25, currentY - 5, pageWidth - 50, 35, 'F')
        doc.setDrawColor(colors.warning[0], colors.warning[1], colors.warning[2])
        doc.setLineWidth(1)
        doc.rect(25, currentY - 5, pageWidth - 50, 35, 'S')
        
        // Warning icon area
        doc.setFillColor(colors.warning[0], colors.warning[1], colors.warning[2])
        doc.circle(40, currentY + 8, 8, 'F')
        doc.setTextColor(colors.white[0], colors.white[1], colors.white[2])
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('!', 37, currentY + 11)
        
        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(colors.warning[0], colors.warning[1], colors.warning[2])
        doc.text('No User Performance Data Available', 55, currentY + 5)
        
        doc.setFontSize(11)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(colors.textSecondary[0], colors.textSecondary[1], colors.textSecondary[2])
        doc.text('No call activity found for the selected time period.', 55, currentY + 15)
        doc.text('Try selecting a different date range or ensure calls have been logged.', 55, currentY + 25)
        
        currentY += 45
      }
      
      // RECENT CALL ACTIVITY SECTION with modern styling
      if (reportData.detailedCallLogs && reportData.detailedCallLogs.length > 0) {
        if (currentY > 180) {
          doc.addPage()
          currentY = 30
        }
        
        // Vibrant section header
        doc.setFillColor(colors.warning[0], colors.warning[1], colors.warning[2])
        doc.rect(20, currentY - 8, pageWidth - 40, 24, 'F')
        
        // Add accent stripe
        doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2])
        doc.rect(20, currentY - 8, 6, 24, 'F')
        
        doc.setTextColor(colors.white[0], colors.white[1], colors.white[2])
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.text('📞 RECENT CALL ACTIVITY LOG', 35, currentY + 4)
        
        // Reset text color
        doc.setTextColor(colors.textPrimary[0], colors.textPrimary[1], colors.textPrimary[2])
        currentY += 35
        
        // Activity summary with styled background
        doc.setFillColor(colors.warningLight[0], colors.warningLight[1], colors.warningLight[2])
        doc.rect(25, currentY - 5, pageWidth - 50, 18, 'F')
        doc.setDrawColor(colors.warning[0], colors.warning[1], colors.warning[2])
        doc.setLineWidth(0.5)
        doc.rect(25, currentY - 5, pageWidth - 50, 18, 'S')
        
        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(colors.warning[0], colors.warning[1], colors.warning[2])
        doc.text(`📋 Displaying ${Math.min(reportData.detailedCallLogs.length, 20)} most recent calls`, 30, currentY + 5)
        currentY += 25
        
        const callData = reportData.detailedCallLogs.slice(0, 20).map(call => [
          new Date(call.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
          `${call.users?.first_name || ''} ${call.users?.last_name || ''}`.trim() || 'Unknown',
          call.clients?.principal_key_holder || 'Unknown',
          call.call_status || 'Unknown',
          call.call_duration ? `${Math.floor(call.call_duration / 60)}:${(call.call_duration % 60).toString().padStart(2, '0')}` : 'N/A'
        ])

        if (hasAutoTable && typeof (doc as any).autoTable === 'function') {
          ;(doc as any).autoTable({
            startY: currentY,
            head: [['Date', 'Agent', 'Client', 'Status', 'Duration']],
            body: callData,
            theme: 'grid',
            headStyles: { 
              fillColor: colors.warning,
              textColor: colors.white,
              fontStyle: 'bold',
              fontSize: 11,
              cellPadding: { top: 6, bottom: 6, left: 6, right: 6 },
              halign: 'center'
            },
            bodyStyles: {
              fontSize: 10,
              cellPadding: { top: 4, bottom: 4, left: 6, right: 6 }
            },
            alternateRowStyles: {
              fillColor: colors.warningLight
            },
            columnStyles: {
              0: { cellWidth: 25, halign: 'center' },
              1: { cellWidth: 45, fontStyle: 'bold', textColor: colors.textPrimary },
              2: { cellWidth: 60, textColor: colors.textSecondary },
              3: { cellWidth: 30, halign: 'center' },
              4: { cellWidth: 25, halign: 'center', textColor: colors.primary }
            },
            margin: { left: 25, right: 25 },
            styles: {
              lineColor: colors.borderColor,
              lineWidth: 0.3
            }
          })
        } else {
          // Enhanced call activity cards
          callData.forEach((call, index) => {
            const cardY = currentY + (index * 22)
            
            // Status-based styling
            let statusColor = colors.light
            let borderColor = colors.grayLight
            if (call[3] === 'completed') {
              statusColor = colors.successLight
              borderColor = colors.success
            } else if (call[3] === 'missed') {
              statusColor = colors.warningLight
              borderColor = colors.warning
            } else if (call[3] === 'declined') {
              statusColor = colors.dangerLight
              borderColor = colors.danger
            }
            
            // Card shadow
            doc.setFillColor(colors.grayLight[0], colors.grayLight[1], colors.grayLight[2])
            doc.rect(27, cardY + 1, pageWidth - 54, 20, 'F')
            
            // Main card
            doc.setFillColor(statusColor[0], statusColor[1], statusColor[2])
            doc.rect(25, cardY, pageWidth - 50, 20, 'F')
            
            // Status indicator border
            doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2])
            doc.setLineWidth(1)
            doc.rect(25, cardY, pageWidth - 50, 20, 'S')
            
            // Left status indicator
            doc.setFillColor(borderColor[0], borderColor[1], borderColor[2])
            doc.rect(25, cardY, 4, 20, 'F')
            
            // Call information layout
            doc.setFontSize(10)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(colors.textPrimary[0], colors.textPrimary[1], colors.textPrimary[2])
            doc.text(`${call[0]}`, 32, cardY + 8)
            doc.text(`${call[1]}`, 32, cardY + 16)
            
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(colors.textSecondary[0], colors.textSecondary[1], colors.textSecondary[2])
            doc.text(`→ ${call[2]}`, 85, cardY + 8)
            
            // Status badge
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(borderColor[0], borderColor[1], borderColor[2])
            doc.text(`${call[3]} (${call[4]})`, 85, cardY + 16)
          })
        }
      }
      
      // ENHANCED PROFESSIONAL FOOTER
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        
        // Footer gradient background
        const footerY = pageHeight - 20
        
        // Main footer background
        doc.setFillColor(colors.dark[0], colors.dark[1], colors.dark[2])
        doc.rect(0, footerY, pageWidth, 20, 'F')
        
        // Top accent line
        doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2])
        doc.rect(0, footerY, pageWidth, 2, 'F')
        
        // Company branding and confidentiality notice
        doc.setTextColor(colors.white[0], colors.white[1], colors.white[2])
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('DIALER SYSTEM', 20, footerY + 10)
        
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(colors.grayLight[0], colors.grayLight[1], colors.grayLight[2])
        doc.text('© 2025 • Confidential Business Report', 20, footerY + 16)
        
        // Page information
        doc.setTextColor(colors.white[0], colors.white[1], colors.white[2])
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text(`Page ${i}`, pageWidth - 40, footerY + 10, { align: 'right' })
        
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(colors.grayLight[0], colors.grayLight[1], colors.grayLight[2])
        doc.text(`of ${pageCount}`, pageWidth - 40, footerY + 16, { align: 'right' })
        
        // Generation timestamp (small, right-aligned)
        doc.setFontSize(7)
        doc.text(`Generated: ${new Date().toLocaleString('en-US', { 
          month: 'short', day: '2-digit', year: 'numeric', 
          hour: '2-digit', minute: '2-digit', hour12: true 
        })}`, pageWidth / 2, footerY + 16, { align: 'center' })
      }
      
      // Generate filename
      const now = new Date()
      const dateStr = now.toISOString().split('T')[0]
      const filename = `dialer-${reportType}-report-${dateStr}.pdf`
      
      console.log('Saving PDF as:', filename)
      doc.save(filename)
      
      console.log('PDF generated successfully!')
      alert('PDF report generated and downloaded successfully!')
      
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert(`Error generating PDF report: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const exportReports = async () => {
    await generatePDFReport()
  }

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You need admin privileges to view reports.</p>
        </div>
      </DashboardLayout>
    )
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </DashboardLayout>
    )
  }

  const systemStats: SystemStats = reportData?.systemStats || {
    total_calls: 0,
    completed_calls: 0,
    overall_success_rate: 0,
    average_call_duration: 0,
    total_users: 0,
    active_users: 0,
    callbacks_pending: 0,
    callbacks_overdue: 0,
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Enhanced Header with gradient background */}
        <div className="flex justify-between items-center bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-xl shadow-lg mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">📊 Admin Reports Dashboard</h1>
            <p className="text-blue-100 text-lg">
              Comprehensive analytics and performance insights
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={testPDFGeneration}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center shadow-lg hover:shadow-xl"
            >
              <DocumentIcon className="w-5 h-5 mr-2" />
              Test PDF
            </button>
            <button
              onClick={exportReports}
              disabled={isGeneratingPDF}
              className={`${
                isGeneratingPDF 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-emerald-500 hover:bg-emerald-600 shadow-lg hover:shadow-xl'
              } text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center`}
            >
              <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
              {isGeneratingPDF ? 'Generating PDF...' : 'Export PDF Report'}
            </button>
          </div>
        </div>

        {/* Enhanced Filters Section */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <div className="w-2 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full mr-3"></div>
            <h2 className="text-xl font-bold text-gray-900">Report Configuration</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Report Type</label>
              <div className="relative">
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as 'daily' | 'weekly' | 'monthly')}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                >
                  <option value="daily">📅 Daily Report</option>
                  <option value="weekly">📊 Weekly Report</option>
                  <option value="monthly">📈 Monthly Report</option>
                </select>
              </div>
            </div>
            
            {reportType === 'daily' && (
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Specific Date</label>
                <input
                  type="date"
                  value={specificDate}
                  onChange={(e) => setSpecificDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Filter by User</label>
              <div className="relative">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                >
                  <option value="">👥 All Users</option>
                  {allUsers && allUsers.length > 0 ? (
                    allUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        👤 {user.first_name} {user.last_name} ({user.role})
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>⏳ Loading users...</option>
                  )}
                </select>
              </div>
            </div>
          </div>
          
          {/* Enhanced Update button */}
          <div className="mt-6 flex justify-between items-center">
            <button
              onClick={fetchReports}
              disabled={loading}
              className={`${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl'
              } text-white px-8 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Loading Report...
                </>
              ) : (
                <>
                  <ArrowTrendingUpIcon className="w-5 h-5 mr-2" />
                  Update Report
                </>
              )}
            </button>
            
            {reportData && (
              <div className={`${
                selectedUserId 
                  ? 'bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200' 
                  : 'bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200'
              } rounded-lg p-4 max-w-2xl`}>
                <div className="flex items-start">
                  <div className={`w-2 h-2 ${
                    selectedUserId ? 'bg-blue-400' : 'bg-emerald-400'
                  } rounded-full mt-2 mr-3 flex-shrink-0`}></div>
                  <div>
                    <p className={`text-sm font-semibold ${
                      selectedUserId ? 'text-blue-800' : 'text-emerald-800'
                    }`}>
                      {selectedUserId ? 'Filtered Report Configuration' : 'Current Report Configuration'}
                    </p>
                    <p className={`text-sm ${
                      selectedUserId ? 'text-blue-700' : 'text-emerald-700'
                    } mt-1`}>
                      <strong>{reportType.charAt(0).toUpperCase() + reportType.slice(1)}</strong> report
                      {reportType === 'daily' && specificDate && ` for ${new Date(specificDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
                      {reportType === 'weekly' && ' for current week'}
                      {reportType === 'monthly' && ' for current month'}
                      {selectedUserId && (
                        <span className="block mt-1">
                          🔍 <strong>Filtered by:</strong> {allUsers.find(u => u.id === selectedUserId)?.first_name} {allUsers.find(u => u.id === selectedUserId)?.last_name}
                          <span className="ml-2 text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                            User Filter Active
                          </span>
                        </span>
                      )}
                      {!selectedUserId && (
                        <span className="block mt-1 text-xs text-gray-600">
                          💡 Select a specific user above to filter all report sections
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* System Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-primary-100">
                <PhoneIcon className="w-6 h-6 text-primary-600" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {systemStats.total_calls || 0}
                </div>
                <div className="text-sm text-gray-600">Total Calls</div>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {systemStats.completed_calls || 0} completed, {(systemStats.total_calls || 0) - (systemStats.completed_calls || 0)} other
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-success-100">
                <ArrowTrendingUpIcon className="w-6 h-6 text-success-600" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {systemStats.overall_success_rate || 0}%
                </div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              System-wide completion rate
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-warning-100">
                <ClockIcon className="w-6 h-6 text-warning-600" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {systemStats.callbacks_pending || 0}
                </div>
                <div className="text-sm text-gray-600">Pending Callbacks</div>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {systemStats.callbacks_overdue || 0} overdue
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-info-100">
                <UserGroupIcon className="w-6 h-6 text-info-600" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {systemStats.active_users || 0}
                </div>
                <div className="text-sm text-gray-600">Active Users</div>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              of {systemStats.total_users || 0} total
            </div>
          </div>
        </div>

        {/* User Performance Table */}
        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <ChartBarIcon className="w-5 h-5 mr-2" />
              User Performance Statistics
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">User</th>
                  <th className="table-header">Total Calls</th>
                  <th className="table-header">Success Rate</th>
                  <th className="table-header">Avg Duration</th>
                  <th className="table-header">Callbacks</th>
                  <th className="table-header">Status Breakdown</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData?.userStats && reportData.userStats.length > 0 ? (
                  reportData.userStats.map((user) => (
                    <tr key={user.user_id} className="hover:bg-gray-50">
                      <td className="table-cell">
                        <div>
                          <div className="font-medium text-gray-900">
                            {user.first_name && user.last_name 
                              ? `${user.first_name} ${user.last_name}`
                              : user.email || `User ${user.user_id}`
                            }
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email || 'No email provided'}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="font-medium">{user.total_calls || 0}</span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center">
                          <span className={`font-medium ${
                            (user.success_rate || 0) >= 80 ? 'text-success-600' :
                            (user.success_rate || 0) >= 60 ? 'text-warning-600' :
                            'text-danger-600'
                          }`}>
                            {user.success_rate || 0}%
                          </span>
                          {(user.success_rate || 0) >= 80 ? (
                            <ArrowTrendingUpIcon className="w-4 h-4 text-success-600 ml-1" />
                          ) : (user.success_rate || 0) < 60 ? (
                            <ArrowTrendingDownIcon className="w-4 h-4 text-danger-600 ml-1" />
                          ) : null}
                        </div>
                      </td>
                      <td className="table-cell">
                        {user.average_call_duration ? `${Math.round(user.average_call_duration)}s` : 'N/A'}
                      </td>
                      <td className="table-cell">
                        {user.callbacks_requested || 0}
                      </td>
                      <td className="table-cell">
                        <div className="text-sm">
                          <div className="text-success-600">✓ {user.completed_calls || 0}</div>
                          <div className="text-warning-600">⏰ {user.missed_calls || 0}</div>
                          <div className="text-danger-600">✗ {user.declined_calls || 0}</div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="table-cell text-center py-8">
                      <div className="text-gray-500">
                        <div className="text-lg mb-2">📊</div>
                        <div className="font-medium">No user performance data available</div>
                        <div className="text-sm">
                          {reportData ? 
                            'No calls found for the selected period and filters.' :
                            'Click "Update Report" to load data.'
                          }
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Call Logs with User Attribution */}
        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <PhoneIcon className="w-5 h-5 mr-2" />
                  Recent Call Activity (User Attribution)
                  {selectedUserId && (
                    <span className="ml-3 inline-flex items-center px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mr-1"></span>
                      Filtered by User
                    </span>
                  )}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedUserId ? (
                    <>
                      Showing {reportData?.detailedCallLogs?.length || 0} calls by{' '}
                      <span className="font-semibold text-blue-600">
                        {allUsers.find(u => u.id === selectedUserId)?.first_name} {allUsers.find(u => u.id === selectedUserId)?.last_name}
                      </span>
                    </>
                  ) : (
                    `Showing the most recent ${reportData?.detailedCallLogs?.length || 0} calls with user attribution`
                  )}
                </p>
              </div>
              {selectedUserId && (
                <button
                  onClick={() => setSelectedUserId('')}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear Filter
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Date & Time</th>
                  <th className="table-header">User</th>
                  <th className="table-header">Client</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Duration</th>
                  <th className="table-header">Notes</th>
                  <th className="table-header">Callback</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData?.detailedCallLogs && reportData.detailedCallLogs.length > 0 ? (
                  reportData.detailedCallLogs.slice(0, 50).map((log: any) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="table-cell">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {new Date(log.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-gray-500">
                            {new Date(log.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {log.users?.first_name} {log.users?.last_name}
                          </div>
                          <div className="text-gray-500 capitalize">
                            {log.users?.role}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {log.clients?.principal_key_holder}
                          </div>
                          <div className="text-gray-500">
                            Box {log.clients?.box_number} • {log.clients?.telephone_cell}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          log.call_status === 'completed' ? 'bg-success-100 text-success-800' :
                          log.call_status === 'missed' ? 'bg-warning-100 text-warning-800' :
                          'bg-danger-100 text-danger-800'
                        }`}>
                          {log.call_status.replace('_', ' ')}
                        </span>
                        <div className="text-xs text-gray-500 mt-1 capitalize">
                          {log.call_type}
                        </div>
                      </td>
                      <td className="table-cell">
                        {log.call_duration ? `${Math.floor(log.call_duration / 60)}:${(log.call_duration % 60).toString().padStart(2, '0')}` : 'N/A'}
                      </td>
                      <td className="table-cell">
                        <div className="text-sm text-gray-900 max-w-xs truncate" title={log.notes}>
                          {log.notes || 'No notes'}
                        </div>
                      </td>
                      <td className="table-cell">
                        {log.callback_requested ? (
                          <div className="text-sm">
                            <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              Requested
                            </span>
                            {log.callback_time && (
                              <div className="text-xs text-gray-500 mt-1">
                                {new Date(log.callback_time).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">No</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="table-cell text-center py-12">
                      <div className="text-gray-500">
                        <div className="text-6xl mb-4">📞</div>
                        <div className="text-lg font-medium mb-2">
                          {selectedUserId ? 'No call activity found for selected user' : 'No call activity found'}
                        </div>
                        <div className="text-sm">
                          {selectedUserId ? (
                            <>
                              <span className="font-medium">
                                {allUsers.find(u => u.id === selectedUserId)?.first_name} {allUsers.find(u => u.id === selectedUserId)?.last_name}
                              </span> hasn&apos;t made any calls in the selected time period.
                              <br />
                              <button
                                onClick={() => setSelectedUserId('')}
                                className="mt-2 text-blue-600 hover:text-blue-800 font-medium underline"
                              >
                                View all users&apos; calls
                              </button>
                            </>
                          ) : (
                            'No calls have been logged for the selected time period.'
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Call Volume Chart Placeholder */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CalendarIcon className="w-5 h-5 mr-2" />
            Call Volume by Date
          </h3>
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <ChartBarIcon className="w-12 h-12 mx-auto mb-2" />
              <p>Chart visualization would be implemented here</p>
              <p className="text-sm">Total data points: {reportData?.callVolumeByDate?.length || 0}</p>
            </div>
          </div>
        </div>

        {/* Top Client Interactions */}
        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  Most Contacted Clients (with User Attribution)
                  {selectedUserId && (
                    <span className="ml-3 inline-flex items-center px-3 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                      <span className="w-2 h-2 bg-purple-400 rounded-full mr-1"></span>
                      Filtered by User
                    </span>
                  )}
                </h3>
                {selectedUserId && (
                  <p className="text-sm text-gray-600 mt-1">
                    Showing clients contacted by{' '}
                    <span className="font-semibold text-purple-600">
                      {allUsers.find(u => u.id === selectedUserId)?.first_name} {allUsers.find(u => u.id === selectedUserId)?.last_name}
                    </span>
                  </p>
                )}
              </div>
              {selectedUserId && (
                <button
                  onClick={() => setSelectedUserId('')}
                  className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                >
                  Clear Filter
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Client</th>
                  <th className="table-header">Total Calls</th>
                  <th className="table-header">Last Contact</th>
                  <th className="table-header">Last Called By</th>
                  <th className="table-header">Called By Users</th>
                  <th className="table-header">Call Distribution</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData?.clientInteractions && reportData.clientInteractions.length > 0 ? (
                  reportData.clientInteractions.slice(0, 10).map((client: any, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="table-cell">
                        <div>
                          <div className="font-medium text-gray-900">
                            {client.client?.principal_key_holder}
                          </div>
                          <div className="text-sm text-gray-500">
                            {client.client?.telephone_cell} - Box {client.client?.box_number}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="font-medium">{client.totalCalls}</span>
                      </td>
                      <td className="table-cell">
                        {new Date(client.lastCall).toLocaleDateString()}
                      </td>
                      <td className="table-cell">
                        <div className="text-sm">
                          {client.lastCalledBy ? (
                            <div>
                              <div className="font-medium text-gray-900">
                                {client.lastCalledBy.first_name} {client.lastCalledBy.last_name}
                              </div>
                              <div className="text-gray-500">
                                {client.lastCalledBy.email}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">Unknown</span>
                          )}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex flex-wrap gap-1">
                          {client.calledByUsers?.slice(0, 3).map((userName: string, idx: number) => (
                            <span key={idx} className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                              {userName}
                            </span>
                          ))}
                          {client.calledByUsers?.length > 3 && (
                            <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                              +{client.calledByUsers.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex space-x-2 text-sm">
                          <span className="text-success-600">
                            ✓ {client.callsByStatus?.completed || 0}
                          </span>
                          <span className="text-warning-600">
                            ⏰ {client.callsByStatus?.missed || 0}
                          </span>
                          <span className="text-danger-600">
                            ✗ {client.callsByStatus?.declined || 0}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="table-cell text-center py-12">
                      <div className="text-gray-500">
                        <div className="text-6xl mb-4">👥</div>
                        <div className="text-lg font-medium mb-2">
                          {selectedUserId ? 'No client contacts found for selected user' : 'No client contacts found'}
                        </div>
                        <div className="text-sm">
                          {selectedUserId ? (
                            <>
                              <span className="font-medium">
                                {allUsers.find(u => u.id === selectedUserId)?.first_name} {allUsers.find(u => u.id === selectedUserId)?.last_name}
                              </span> hasn&apos;t contacted any clients in the selected time period.
                              <br />
                              <button
                                onClick={() => setSelectedUserId('')}
                                className="mt-2 text-purple-600 hover:text-purple-800 font-medium underline"
                              >
                                View all client interactions
                              </button>
                            </>
                          ) : (
                            'No client interactions have been recorded for the selected time period.'
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}