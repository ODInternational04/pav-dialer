// Utility function to load jsPDF with autoTable plugin
export const loadJsPDFWithAutoTable = async () => {
  try {
    // Load jsPDF first
    const jsPDFModule = await import('jspdf')
    const jsPDF = jsPDFModule.default
    
    // Then load and apply the autoTable plugin
    const autoTableModule = await import('jspdf-autotable')
    
    // Create a new instance
    const doc = new jsPDF()
    
    // Verify autoTable is available
    if (typeof (doc as any).autoTable !== 'function') {
      console.warn('autoTable not automatically attached, trying manual attachment')
      
      // Try to manually attach the plugin if it's not automatically attached
      if (autoTableModule.default && typeof autoTableModule.default === 'function') {
        (autoTableModule.default as any)(jsPDF)
      }
    }
    
    return { jsPDF, doc }
  } catch (error) {
    console.error('Error loading jsPDF with autoTable:', error)
    throw error
  }
}

// Alternative simple PDF generator without autoTable
export const createSimplePDF = () => {
  return import('jspdf').then(jsPDFModule => {
    const jsPDF = jsPDFModule.default
    return new jsPDF()
  })
}