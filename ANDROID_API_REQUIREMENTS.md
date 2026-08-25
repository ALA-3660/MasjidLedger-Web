# Android Kotlin + Jetpack Compose Integration Guide

This guide describes the complete architecture, dependencies, and code patterns required to integrate the native Kotlin Android application with the MasjidLedger backend.

---

## 1. Network & Connection Configuration

### 1.1 Base URLs for Android
In `build.gradle.kts` / `local.properties`:

```kotlin
// In debug builds / emulator:
val BASE_URL = "http://10.0.2.2:3000/api/v1/"
val WS_URL = "ws://10.0.2.2:3000/ws"

// In release / production builds:
val PROD_BASE_URL = "https://<YOUR_DEPLOYED_URL>/api/v1/"
val PROD_WS_URL = "wss://<YOUR_DEPLOYED_URL>/ws"
```

### 1.2 Android Network Security Config
In `app/src/main/res/xml/network_security_config.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">10.0.2.2</domain>
        <domain includeSubdomains="true">192.168.0.0/16</domain>
    </domain-config>
</network-security-config>
```

In `AndroidManifest.xml`:
```xml
<application
    android:networkSecurityConfig="@xml/network_security_config"
    android:usesCleartextTraffic="true" ... >
```

---

## 2. Recommended Dependency Stack

```kotlin
dependencies {
    // Jetpack Compose & Material 3
    implementation(platform("androidx.compose:compose-bom:2024.06.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.4")

    // Networking - Retrofit & OkHttp
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-moshi:2.11.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

    // Moshi JSON Serialization
    implementation("com.squareup.moshi:moshi-kotlin:1.15.1")

    // WebSocket Client (OkHttp WebSocket or Scarlet)
    implementation("com.tinder.scarlet:scarlet:0.1.12")
    implementation("com.tinder.scarlet:websocket-okhttp:0.1.12")
    implementation("com.tinder.scarlet:message-adapter-moshi:0.1.12")
    implementation("com.tinder.scarlet:stream-adapter-coroutines:0.1.12")

    // Room Database (Offline-First Local Cache)
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    kapt("androidx.room:room-compiler:2.6.1")

    // Dependency Injection
    implementation("com.google.dagger:hilt-android:2.51.1")
    kapt("com.google.dagger:hilt-compiler:2.51.1")
}
```

---

## 3. OkHttp Authentication & Idempotency Interceptor

To satisfy **Financial Transaction Safety** and **Multi-Tenant Isolation**, configure OkHttp interceptors:

```kotlin
package org.masjidledger.android.data.network

import okhttp3.Interceptor
import okhttp3.Response
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MasjidAuthInterceptor @Inject constructor(
    private val sessionManager: SessionManager
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val requestBuilder = chain.request().newBuilder()

        // Attach JWT Auth token
        sessionManager.getAuthToken()?.let { token ->
            requestBuilder.addHeader("Authorization", "Bearer $token")
        }

        // Attach Multi-Tenant Mosque Context
        sessionManager.getMosqueId()?.let { mosqueId ->
            requestBuilder.addHeader("x-mosque-id", mosqueId)
        }

        // Attach Current User Context
        sessionManager.getUserId()?.let { userId ->
            requestBuilder.addHeader("x-user-id", userId)
        }

        // Add Idempotency-Key on POST/PUT requests to prevent duplicate vouchers on network retries
        if (chain.request().method in listOf("POST", "PUT")) {
            val idempotencyKey = UUID.randomUUID().toString()
            requestBuilder.addHeader("Idempotency-Key", idempotencyKey)
        }

        return chain.proceed(requestBuilder.build())
    }
}
```

---

## 4. Retrofit API Interface Definition

```kotlin
package org.masjidledger.android.data.network

import retrofit2.http.*
import org.masjidledger.android.data.model.*

interface MasjidApiService {

    // --- Authentication ---
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): ApiResponse<AuthResponse>

    @GET("auth/me")
    suspend fun getCurrentUser(): ApiResponse<UserContextResponse>

    // --- Dashboard ---
    @GET("dashboard/stats")
    suspend fun getDashboardStats(): ApiResponse<DashboardStats>

    // --- Accounting Accounts & Heads ---
    @GET("accounting/accounts")
    suspend fun getAccounts(): ApiResponse<List<FinancialAccount>>

    @POST("accounting/accounts/transfer")
    suspend fun transferFunds(@Body request: TransferRequest): ApiResponse<AccountTransfer>

    @GET("accounting/account-heads")
    suspend fun getAccountHeads(): ApiResponse<List<AccountHead>>

    // --- Income Management ---
    @GET("accounting/income")
    suspend fun getIncomes(
        @Query("fromDate") fromDate: String? = null,
        @Query("toDate") toDate: String? = null
    ): ApiResponse<List<IncomeEntry>>

    @POST("accounting/income")
    suspend fun createIncome(@Body entry: CreateIncomeRequest): ApiResponse<IncomeEntry>

    @POST("accounting/income/{id}/reverse")
    suspend fun reverseIncome(
        @Path("id") id: String,
        @Body request: ReversalRequest
    ): ApiResponse<IncomeEntry>

    // --- Expense Management ---
    @GET("accounting/expense")
    suspend fun getExpenses(): ApiResponse<List<ExpenseEntry>>

    @POST("accounting/expense")
    suspend fun createExpense(@Body entry: CreateExpenseRequest): ApiResponse<ExpenseEntry>

    @POST("accounting/expense/{id}/reverse")
    suspend fun reverseExpense(
        @Path("id") id: String,
        @Body request: ReversalRequest
    ): ApiResponse<ExpenseEntry>

    // --- Donations & Boxes ---
    @GET("donations")
    suspend fun getDonations(): ApiResponse<List<Donation>>

    @POST("donations")
    suspend fun createDonation(@Body request: CreateDonationRequest): ApiResponse<Donation>

    @GET("donation-boxes")
    suspend fun getDonationBoxes(): ApiResponse<DonationBoxesResponse>

    @POST("donation-boxes/collect")
    suspend fun collectDonationBox(@Body request: BoxCollectionRequest): ApiResponse<DonationBoxCollection>

    // --- Committee ---
    @GET("committee")
    suspend fun getCommitteeData(): ApiResponse<CommitteeResponse>

    @POST("committee/members")
    suspend fun addCommitteeMember(@Body member: CreateMemberRequest): ApiResponse<CommitteeMember>

    // --- Staff & Payroll ---
    @GET("staff")
    suspend fun getStaffList(): ApiResponse<List<Staff>>

    @POST("staff/pay")
    suspend fun payStaffSalary(@Body payment: StaffPaymentRequest): ApiResponse<StaffPayment>

    // --- Cemetery & Notices ---
    @GET("cemetery")
    suspend fun getCemeteryRecords(): ApiResponse<List<CemeteryRecord>>

    @POST("cemetery")
    suspend fun addCemeteryRecord(@Body record: CreateCemeteryRequest): ApiResponse<CemeteryRecord>

    @GET("notices")
    suspend fun getNotices(): ApiResponse<List<MosqueNotice>>

    @POST("notices")
    suspend fun createNotice(@Body notice: CreateNoticeRequest): ApiResponse<MosqueNotice>

    // --- AI Advisor ---
    @POST("ai/advisor")
    suspend fun askAiAdvisor(@Body request: AiAdvisorRequest): ApiResponse<AiAdvisorResponse>
}
```

---

## 5. Offline-First & Real-Time Sync Strategy

1. **Local Room Database**:
   - Entities (`IncomeEntity`, `ExpenseEntity`, `AccountEntity`, `DonationEntity`, `NoticeEntity`).
   - Repository layer returns `Flow<List<DomainModel>>` directly from Room DB for instant offline display.
2. **Background Sync Worker**:
   - Fetches latest delta updates from REST API on launch and network restoration.
3. **Live WebSocket Stream**:
   - Native Android WebSocket listens for `INCOME_CREATED`, `EXPENSE_CREATED`, `DONATION_CREATED`, `BALANCE_UPDATED`, etc.
   - Incoming events are immediately inserted/updated in Room DB, automatically triggering Compose UI re-render via StateFlow.

---

## 6. Standardized Bengali Typography System (Material 3)

The Android Jetpack Compose typography system maps:
- **Headings & Titles** → **Hind Siliguri** (Weights: Regular 400, Medium 500, SemiBold 600, Bold 700)
- **Body & Controls** → **Tiro Bangla** (Weight: Regular 400)

### 6.1 Font Families Definition (`ui/theme/Type.kt`)

```kotlin
package org.masjidledger.android.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.googlefonts.Font
import androidx.compose.ui.text.googlefonts.GoogleFont
import androidx.compose.ui.unit.sp
import org.masjidledger.android.R

// Google Font Provider Setup
val provider = GoogleFont.Provider(
    providerAuthority = "com.google.android.gms.fonts",
    providerPackage = "com.google.android.gms",
    certificates = R.array.com_google_android_gms_fonts_certs
)

// Primary Heading Font: Hind Siliguri
val HindSiliguriFont = GoogleFont("Hind Siliguri")
val HindSiliguriFamily = FontFamily(
    Font(googleFont = HindSiliguriFont, fontProvider = provider, weight = FontWeight.Normal),
    Font(googleFont = HindSiliguriFont, fontProvider = provider, weight = FontWeight.Medium),
    Font(googleFont = HindSiliguriFont, fontProvider = provider, weight = FontWeight.SemiBold),
    Font(googleFont = HindSiliguriFont, fontProvider = provider, weight = FontWeight.Bold)
)

// Primary Body & UI Font: Tiro Bangla
val TiroBanglaFont = GoogleFont("Tiro Bangla")
val TiroBanglaFamily = FontFamily(
    Font(googleFont = TiroBanglaFont, fontProvider = provider, weight = FontWeight.Normal)
)

// Material 3 Typography Scale Mapping
val MasjidLedgerTypography = Typography(
    // App & Display Headings (Hind Siliguri Bold / SemiBold)
    displayLarge = TextStyle(
        fontFamily = HindSiliguriFamily,
        fontWeight = FontWeight.Bold,
        fontSize = 32.sp,
        lineHeight = 40.sp,
        letterSpacing = (-0.25).sp
    ),
    displayMedium = TextStyle(
        fontFamily = HindSiliguriFamily,
        fontWeight = FontWeight.Bold,
        fontSize = 28.sp,
        lineHeight = 36.sp
    ),
    displaySmall = TextStyle(
        fontFamily = HindSiliguriFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 24.sp,
        lineHeight = 32.sp
    ),

    // Section & Page Headings (Hind Siliguri SemiBold / Medium)
    headlineLarge = TextStyle(
        fontFamily = HindSiliguriFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 22.sp,
        lineHeight = 28.sp
    ),
    headlineMedium = TextStyle(
        fontFamily = HindSiliguriFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 20.sp,
        lineHeight = 26.sp
    ),
    headlineSmall = TextStyle(
        fontFamily = HindSiliguriFamily,
        fontWeight = FontWeight.Medium,
        fontSize = 18.sp,
        lineHeight = 24.sp
    ),

    // Card & Dialog Titles (Hind Siliguri Medium)
    titleLarge = TextStyle(
        fontFamily = HindSiliguriFamily,
        fontWeight = FontWeight.Medium,
        fontSize = 18.sp,
        lineHeight = 24.sp
    ),
    titleMedium = TextStyle(
        fontFamily = HindSiliguriFamily,
        fontWeight = FontWeight.Medium,
        fontSize = 16.sp,
        lineHeight = 22.sp
    ),
    titleSmall = TextStyle(
        fontFamily = HindSiliguriFamily,
        fontWeight = FontWeight.Medium,
        fontSize = 14.sp,
        lineHeight = 20.sp
    ),

    // Body Text & Descriptions (Tiro Bangla Regular)
    bodyLarge = TextStyle(
        fontFamily = TiroBanglaFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 24.sp,
        letterSpacing = 0.15.sp
    ),
    bodyMedium = TextStyle(
        fontFamily = TiroBanglaFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.25.sp
    ),
    bodySmall = TextStyle(
        fontFamily = TiroBanglaFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 12.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.4.sp
    ),

    // Buttons, Badges, & Form Labels (Tiro Bangla Medium / Normal)
    labelLarge = TextStyle(
        fontFamily = TiroBanglaFamily,
        fontWeight = FontWeight.Medium,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.1.sp
    ),
    labelMedium = TextStyle(
        fontFamily = TiroBanglaFamily,
        fontWeight = FontWeight.Medium,
        fontSize = 12.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.5.sp
    ),
    labelSmall = TextStyle(
        fontFamily = TiroBanglaFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 11.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.5.sp
    )
)
```

