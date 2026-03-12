# Direct SIP Calling Implementation Guide

## 📞 Overview

This guide explains how to implement **browser-based WebRTC SIP calling** directly in your dialer system, allowing users to make real phone calls from the web browser without any desktop applications.

---

## ✅ What You Get

- **Make calls directly from browser** - no external apps needed
- **Receive incoming calls** - if your SIP provider supports it
- **Full call control** - mute, hold, transfer, hangup
- **Call logging integration** - automatic logging to your database
- **Multi-user support** - each user has their own SIP credentials
- **Professional softphone UI** - modern in-browser phone interface

---

## 📋 Requirements Checklist

### **1. SIP Provider/Server** (MANDATORY)

You need a SIP provider that supports **WebRTC**. Contact your VoIP provider and get:

- [ ] **SIP Server Address**: `sip.provider.com`
- [ ] **SIP Domain/Realm**: `yourdomain.com`
- [ ] **WebSocket URI**: `wss://sip.provider.com:8089/ws` (CRITICAL - must support WSS)
- [ ] **SIP Username** per user: `user123` or extension `5001`
- [ ] **SIP Password** per user: Your authentication password
- [ ] **STUN Server**: `stun:stun.l.google.com:19302` (or provider's)
- [ ] **TURN Server** (optional): `turn:turn.server.com:3478`

### **2. Network Requirements**

- [ ] **WebSocket Port Open**: Usually port 8089 or 8088 (WSS)
- [ ] **UDP Ports for RTP**: Typically 10000-20000 (audio streams)
- [ ] **STUN/TURN Access**: For NAT traversal
- [ ] **No restrictive firewall** blocking WebSocket connections

### **3. Application Requirements**

- [ ] **HTTPS Deployment**: WebRTC requires secure context (works on localhost for testing)
- [ ] **Modern Browser**: Chrome 74+, Firefox 68+, Safari 12.1+, Edge 79+
- [ ] **Microphone Permission**: Users must grant browser microphone access
- [ ] **JsSIP Library**: Install via npm

### **4. Infrastructure**

- [ ] SSL Certificate (for HTTPS)
- [ ] Hosting environment supports WebSockets
- [ ] Database for storing SIP credentials
- [ ] Encrypted storage for passwords

---

## 🛠️ Implementation Plan

### **Phase 1: Database Setup**

Add SIP credentials table to your Supabase database:

```sql
-- Run in Supabase SQL Editor
CREATE TABLE user_sip_credentials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sip_username VARCHAR(100) NOT NULL,
    sip_password VARCHAR(255) NOT NULL, -- encrypted
    sip_server VARCHAR(255) NOT NULL,
    sip_domain VARCHAR(255) NOT NULL,
    websocket_uri VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX idx_user_sip_credentials_user_id ON user_sip_credentials(user_id);

-- Add SIP call logs enhancement
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS sip_call_id VARCHAR(255);
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS call_direction VARCHAR(20) CHECK (call_direction IN ('outbound', 'inbound'));
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS call_quality_score INTEGER CHECK (call_quality_score BETWEEN 1 AND 5);