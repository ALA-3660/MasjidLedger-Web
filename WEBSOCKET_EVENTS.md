# MasjidLedger Real-Time WebSocket Specification

The MasjidLedger backend features an active bidirectional WebSocket server that broadcasts database state mutations in real time to connected web browsers and native Android apps.

---

## 1. Connection Handshake & Endpoint

- **Endpoint**: `ws://<HOST>:3000/ws` (or `wss://<HOST>:3000/ws` in production)
- **Handshake Query Parameters**:
  - `token`: User JWT token
  - `mosqueId`: Target Mosque ID (e.g. `mosque-mamun-001`)
  - `userId`: User ID

**Example Connection URL**:
```text
ws://10.0.2.2:3000/ws?mosqueId=mosque-mamun-001&userId=usr-admin-1&token=ml-jwt-usr-admin-1-...
```

---

## 2. Heartbeat & Life Cycle

1. **Server Ping**: The server sends a WebSocket `Ping` every 30 seconds.
2. **Client Pong**: The client automatically responds with `Pong`. If no pong is received within 60 seconds, the connection is terminated and cleaned up.
3. **Manual Ping/Pong**:
   - Client sends: `{ "type": "PING" }`
   - Server responds: `{ "type": "PONG", "data": { "timestamp": "2026-08-24T12:00:00.000Z" } }`

---

## 3. Real-Time Synchronization Flow

```
[ ANDROID CLIENT ]                [ BACKEND REST + DB ]              [ WEB CLIENT ]
        │                                  │                               │
        ├── 1. POST /accounting/income ───>│                               │
        │                                  ├── 2. Write to DB (Atomic)     │
        │                                  │                               │
        │<── 3. HTTP 200 OK + Data ────────┤                               │
        │                                  ├── 4. Broadcast Event ────────>│
        │                                  │      (type: INCOME_CREATED)   │
        │                                  │                               ├── 5. Auto Refresh UI
        │                                  │                               │      or Update State
        │                                  │                               │
```

---

## 4. Complete WebSocket Event Catalog

All messages dispatched over WebSocket follow this standard JSON envelope:

```json
{
  "type": "EVENT_TYPE_NAME",
  "mosqueId": "mosque-mamun-001",
  "data": { ... },
  "meta": {
    "timestamp": "2026-08-24T12:00:00.000Z",
    "senderId": "usr-admin-1",
    "eventId": "evt-172450000-abcd"
  }
}
```

### Event Reference Table

| Event Type | Trigger REST API | Payload (`data`) | Description |
| :--- | :--- | :--- | :--- |
| `CONNECTION_ACK` | On WS Connect | `{ clientId, userId, mosqueId, status }` | Acknowledgment of successful connection. |
| `INCOME_CREATED` | `POST /accounting/income` | `IncomeEntry` object | Broadcast when new income is recorded. |
| `INCOME_REVERSED` | `POST /accounting/income/:id/reverse` | `IncomeEntry` object (status CANCELLED) | Broadcast when an income voucher is cancelled. |
| `EXPENSE_CREATED` | `POST /accounting/expense` | `ExpenseEntry` object | Broadcast when an expense voucher is recorded. |
| `EXPENSE_REVERSED` | `POST /accounting/expense/:id/reverse` | `ExpenseEntry` object (status CANCELLED) | Broadcast when an expense is cancelled. |
| `DONATION_CREATED` | `POST /donations` | `Donation` object | Broadcast when a donation receipt is issued. |
| `DONATION_BOX_COLLECTED` | `POST /donation-boxes/collect` | `{ collection, box }` | Broadcast when a donation box is counted and deposited. |
| `ACCOUNT_CREATED` | `POST /accounting/accounts` | `FinancialAccount` object | New account added to mosque. |
| `ACCOUNT_TRANSFER` | `POST /accounting/accounts/transfer` | `{ transfer, fromAccount, toAccount }` | Inter-account fund transfer. |
| `DASHBOARD_STATS_UPDATED` | Any Financial Mutation | `DashboardStats` object | Updated totals, balances, and trend figures. |
| `COMMITTEE_MEMBER_CREATED` | `POST /committee/members` | `CommitteeMember` object | Member added to management committee. |
| `COMMITTEE_MEMBER_UPDATED` | `PUT /committee/members/:id` | `CommitteeMember` object | Member designation updated. |
| `MEETING_CREATED` | `POST /committee/meetings` | `CommitteeMeeting` object | Meeting resolutions published. |
| `STAFF_CREATED` | `POST /staff` | `Staff` object | New staff member appointed. |
| `STAFF_PAID` | `POST /staff/pay` | `StaffPayment` object | Monthly salary paid to staff. |
| `ASSET_CREATED` | `POST /assets` | `MosqueAsset` object | Mosque asset registered. |
| `PROPERTY_CREATED` | `POST /properties` | `MosqueProperty` object | Waqf property or shop registered. |
| `CEMETERY_RECORD_CREATED`| `POST /cemetery` | `CemeteryRecord` object | Grave plot allocated / burial recorded. |
| `NOTICE_CREATED` | `POST /notices` | `MosqueNotice` object | New notice published to mosque community. |
| `NOTIFICATION_CREATED` | System Alert | `MosqueNotification` object | Targeted in-app alert dispatched. |
| `MOSQUE_SETTINGS_UPDATED` | `PUT /mosques/current` | `Mosque` object | Mosque info / QR code updated. |

---

## 5. Android Kotlin Implementation Example

```kotlin
package org.masjidledger.android.data.websocket

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import okhttp3.*
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MasjidWebSocketClient @Inject constructor(
    private val okHttpClient: OkHttpClient
) {
    private var webSocket: WebSocket? = null
    private val _events = MutableSharedFlow<WebSocketEvent>(extraBufferCapacity = 64)
    val events: Flow<WebSocketEvent> = _events.asSharedFlow()

    fun connect(wsUrl: String) {
        val request = Request.Builder().url(wsUrl).build()
        webSocket = okHttpClient.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                println("[WebSocket] Connected successfully")
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                try {
                    val json = JSONObject(text)
                    val eventType = json.optString("type")
                    val mosqueId = json.optString("mosqueId")
                    val dataJson = json.optJSONObject("data")?.toString() ?: "{}"
                    
                    _events.tryEmit(WebSocketEvent(eventType, mosqueId, dataJson))
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                println("[WebSocket] Connection failure: ${t.message}")
            }
        })
    }

    fun disconnect() {
        webSocket?.close(1000, "User logged out")
        webSocket = null
    }
}

data class WebSocketEvent(val type: String, val mosqueId: String, val rawDataJson: String)
```
