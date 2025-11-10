import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Check environment variables (without exposing sensitive data)
    const emailConfig = {
      EMAIL_HOST: process.env.EMAIL_HOST || 'NOT SET',
      EMAIL_PORT: process.env.EMAIL_PORT || 'NOT SET',
      EMAIL_USER: process.env.EMAIL_USER ? '✅ SET' : '❌ NOT SET',
      EMAIL_PASS: process.env.EMAIL_PASS ? '✅ SET' : '❌ NOT SET',
      EMAIL_FROM: process.env.EMAIL_FROM || 'NOT SET',
      NODE_ENV: process.env.NODE_ENV || 'development',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'NOT SET'
    }

    const allConfigured = 
      emailConfig.EMAIL_HOST !== 'NOT SET' &&
      emailConfig.EMAIL_PORT !== 'NOT SET' &&
      emailConfig.EMAIL_USER.includes('✅') &&
      emailConfig.EMAIL_PASS.includes('✅')

    return NextResponse.json({
      success: true,
      configured: allConfigured,
      environment: process.env.NODE_ENV,
      config: emailConfig,
      message: allConfigured 
        ? '✅ Email configuration looks good!' 
        : '❌ Missing email configuration. Please set environment variables in Vercel.'
    })

  } catch (error) {
    console.error('❌ Email config check error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to check email configuration'
    }, { status: 500 })
  }
}