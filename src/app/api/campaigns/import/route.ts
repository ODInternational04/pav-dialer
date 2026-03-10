import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { processCSVImport, formatValidationErrors } from '@/lib/csvImport'

/**
 * POST /api/campaigns/import - Import clients from CSV
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const payload = verifyToken(token)

    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const campaignId = formData.get('campaign_id') as string
    const assignToUser = formData.get('assign_to_user') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 })
    }

    // Verify campaign exists
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Read file content
    const csvText = await file.text()

    // Process and validate CSV
    const importResult = processCSVImport(csvText)

    if (!importResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: formatValidationErrors(importResult.errors),
          imported_count: 0,
          failed_count: importResult.errorCount,
          errors: importResult.errors,
        },
        { status: 400 }
      )
    }

    // Import valid rows
    const createdClients: string[] = []
    const updatedClients: string[] = []
    const failedRows: any[] = []

    const requiredFields = [
      'box_number',
      'size',
      'contract_no',
      'principal_key_holder',
      'principal_key_holder_id_number',
      'principal_key_holder_email_address',
      'telephone_cell',
      'contract_start_date',
      'contract_end_date',
      'occupation'
    ]

    for (let i = 0; i < importResult.validRows.length; i++) {
      const clientData = importResult.validRows[i]

      try {
        // Check for existing client by phone number
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id, custom_fields')
          .eq('phone', clientData.phone)
          .single()

        if (existingClient) {
          const mergedCustomFields = {
            ...(existingClient.custom_fields || {}),
            ...(clientData.custom_fields || {})
          }

          const { error: updateError } = await supabase
            .from('clients')
            .update({
              campaign_id: campaignId,
              assigned_to: assignToUser || null,
              custom_fields: mergedCustomFields,
              last_updated_by: payload.userId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingClient.id)

          if (updateError) {
            failedRows.push({
              row: i + 2,
              data: clientData,
              error: updateError.message,
            })
          } else {
            updatedClients.push(existingClient.id)
          }
        } else {
          const missingRequired = requiredFields.filter(
            (field) => !clientData[field as keyof typeof clientData] || String(clientData[field as keyof typeof clientData]).trim() === ''
          )

          if (missingRequired.length > 0) {
            failedRows.push({
              row: i + 2,
              data: clientData,
              error: `Missing required fields for new client: ${missingRequired.join(', ')}`,
            })
            continue
          }

          const { data, error } = await supabase
            .from('clients')
            .insert({
              ...clientData,
              campaign_id: campaignId,
              assigned_to: assignToUser || null,
              created_by: payload.userId,
              last_updated_by: payload.userId,
            })
            .select('id')
            .single()

          if (error) {
            failedRows.push({
              row: i + 2,
              data: clientData,
              error: error.message,
            })
          } else if (data) {
            createdClients.push(data.id)
          }
        }
      } catch (err: any) {
        failedRows.push({
          row: i + 2,
          data: clientData,
          error: err.message || 'Unknown error',
        })
      }
    }

    // Update campaign target count
    await supabase
      .from('campaigns')
      .update({ target_count: createdClients.length + updatedClients.length })
      .eq('id', campaignId)

    return NextResponse.json({
      success: true,
      imported_count: createdClients.length + updatedClients.length,
      created_count: createdClients.length,
      updated_count: updatedClients.length,
      failed_count: failedRows.length,
      total_rows: importResult.totalRows,
      created_clients: createdClients,
      updated_clients: updatedClients,
      failed_rows: failedRows,
      message: `Successfully processed ${createdClients.length + updatedClients.length} out of ${importResult.totalRows} clients`,
    })
  } catch (error) {
    console.error('Error importing CSV:', error)
    return NextResponse.json(
      { error: 'Failed to import CSV' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/campaigns/import - Get CSV template
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Generate CSV template
    const template = `box_number,size,contract_no,principal_key_holder,principal_key_holder_id_number,principal_key_holder_email_address,telephone_cell,telephone_home,contract_start_date,contract_end_date,occupation,gender,notes
BOX123,Large,CON12345,John Doe,8001015009080,john.doe@example.com,+27123456789,+27987654321,2024-01-01,2024-12-31,Engineer,male,Sample client
BOX124,Medium,CON12346,Jane Smith,8502025009080,jane.smith@example.com,+27123456790,,2024-01-01,2024-12-31,Teacher,female,Sample client
BOX125,Small,CON12347,Bob Johnson,8003035009080,bob.johnson@example.com,+27123456791,,2024-01-01,2024-12-31,Doctor,male,Sample client`

    return new NextResponse(template, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="client_import_template.csv"',
      },
    })
  } catch (error) {
    console.error('Error generating template:', error)
    return NextResponse.json(
      { error: 'Failed to generate template' },
      { status: 500 }
    )
  }
}
