# Documentation Technique — Amali Mobile

> Application de rencontres halal — React + TypeScript + Supabase

---

## 1. Architecture générale

```mermaid
graph TB
    subgraph Client["📱 Client (React PWA)"]
        App["App.tsx — Router principal"]
        Components["33 Composants UI"]
        Hooks["4 Hooks personnalisés"]
        Services["lib/ (supabase, payment, pixel)"]
    end

    subgraph Backend["☁️ Backend (Supabase)"]
        Auth["Supabase Auth"]
        DB[("PostgreSQL\n19 tables")]
        Realtime["Realtime\n(postgres_changes)"]
        Storage["Storage\n(photos, médias)"]
        EdgeFn["Edge Functions\n(paiement, push)"]
    end

    subgraph External["🌐 Services externes"]
        PayTech["PayTech / PayDunya\n(Orange Money, Wave, CB)"]
        MetaPixel["Meta Pixel\n(tracking)"]
        VAPID["Push Notifications\n(VAPID / Service Worker)"]
    end

    App --> Components
    Components --> Hooks
    Components --> Services
    Services --> Auth
    Services --> DB
    Services --> Storage
    DB --> Realtime
    Realtime --> Components
    Services --> EdgeFn
    EdgeFn --> PayTech
    Components --> MetaPixel
    Hooks --> VAPID
```

---

## 2. Navigation & Routing

```mermaid
flowchart TD
    Start([Démarrage]) --> Splash[SplashScreen\n2s d'intro]
    Splash --> CheckAuth{Session\nexistante ?}

    CheckAuth -->|Non| Auth[AuthScreen]
    CheckAuth -->|Oui| CheckProfile{Profil\ncomplété ?}

    Auth -->|Inscription| ProfileCompletion[ProfileCompletion\n8 étapes]
    Auth -->|Connexion| CheckProfile
    Auth -->|Reset mdp| ResetPassword[ResetPasswordScreen]
    ResetPassword --> Auth

    ProfileCompletion -->|Fin wizard| GenderModal[GenderModal]
    GenderModal --> MainApp

    CheckProfile -->|Non| ProfileCompletion
    CheckProfile -->|Oui| MainApp

    subgraph MainApp["🏠 App principale (BottomNavigation)"]
        Discovery["❤️ Discovery\n(swipe)"]
        Community["👥 Community\n(feed + events)"]
        Messages["💬 Messages\n(conversations)"]
        Likes["🔔 Likes reçus"]
        Profile["👤 Profil\n(settings)"]
    end

    Discovery --> MatchModal[MatchModal]
    MatchModal --> Messages
    Likes --> Discovery
    Profile --> PremiumScreen[PremiumScreen]
    PremiumScreen --> PaymentModal[PaymentModal]
```

---

## 3. Flux d'authentification

```mermaid
sequenceDiagram
    actor U as Utilisateur
    participant A as AuthScreen
    participant S as authService
    participant SB as Supabase Auth
    participant DB as profiles table
    participant PC as ProfileCompletion

    U->>A: Saisit email + mot de passe
    A->>S: signUp(email, password, metadata)
    S->>SB: createUser()
    SB-->>S: { user, session }
    S-->>A: Succès

    A->>DB: INSERT profiles (id = user.id)
    A->>PC: Redirige vers wizard

    Note over PC: Étape 1 — Prénom + Date naissance
    Note over PC: Étape 2 — Genre (homme/femme)
    Note over PC: Étape 3 — Photo(s) (compress + upload)
    Note over PC: Étape 4 — Localisation (GPS ou manuel)
    Note over PC: Étape 5 — Bio + Profession
    Note over PC: Étape 6 — Niveau d'études + Taille
    Note over PC: Étape 7 — Fréquence prière + Objectif
    Note over PC: Étape 8 — Hijab + Polygamie + Centres intérêt

    PC->>DB: UPDATE profiles (profile_completed = true)
    PC->>MetaPixel: trackCompleteRegistration()
    PC-->>U: Accès à l'app
```

---

## 4. Discovery — Swipe de profils

```mermaid
flowchart TD
    Load([loadProfiles]) --> GetUser[getCurrentUser]
    GetUser --> GetMyProfile[SELECT profiles WHERE id = me]
    GetMyProfile --> GetAllProfiles[SELECT profiles\nWHERE id ≠ me]
    GetAllProfiles --> GetLikes[SELECT likes\nWHERE from_user_id = me]
    GetLikes --> GetMatches[SELECT matches\nWHERE user1 or user2 = me]

    GetMatches --> Filter{Filtrage}

    Filter -->|likedIds exclus| ExcludeLiked[❌ Retirer likés + matchés]
    Filter -->|passedIds| PassedToEnd[⬇️ Passer en fin de file]
    Filter -->|genre opposé| GenderFilter[🧑‍🤝‍🧑 Garder genre opposé uniquement]
    Filter -->|age ≥ 18| AgeFilter[🔞 Filtrer les mineurs]
    Filter -->|photo présente| PhotoFilter[📸 Photo obligatoire]

    ExcludeLiked --> Shuffle[🔀 Mélange aléatoire\nFisher-Yates]
    PassedToEnd --> Shuffle
    GenderFilter --> Shuffle
    AgeFilter --> Shuffle
    PhotoFilter --> Shuffle

    Shuffle --> Display[Afficher ProfileCard]

    Display --> Action{Action utilisateur}
    Action -->|❤️ Like| HandleLike[handleAction like]
    Action -->|✋ Pass| HandlePass[handleAction pass]

    HandleLike --> CheckCanLike{canLike ?}
    CheckCanLike -->|Non| NoLikesModal[NoMoreLikesModal]
    CheckCanLike -->|Oui| InsertLike[INSERT likes\nlike_type = like]

    InsertLike --> CheckMutual{Like mutuel ?}
    CheckMutual -->|Oui| CreateMatch[INSERT matches\n+ conversations]
    CheckMutual -->|Non| SendNotif[INSERT notifications\ntype = new_like]

    CreateMatch --> MatchModal[MatchModal 🎉]
    CreateMatch --> SendMatchNotif[INSERT notifications\ntype = new_match × 2]

    HandlePass --> InsertPass[INSERT likes\nlike_type = pass]
    InsertPass --> NextCard[currentProfileIndex + 1]
    MatchModal -->|Keep swiping| NextCard
    SendNotif --> NextCard
```

---

## 5. Système de Match

```mermaid
sequenceDiagram
    actor A as User A
    actor B as User B
    participant L as likes table
    participant M as matches table
    participant C as conversations table
    participant N as notifications table

    Note over A,B: A like B
    A->>L: INSERT (from=A, to=B, type='like')
    A->>L: SELECT mutual ? (from=B, to=A)
    L-->>A: mutualLike = null

    Note over A,B: B like A (match !)
    B->>L: INSERT (from=B, to=A, type='like')
    B->>L: SELECT mutual ? (from=A, to=B)
    L-->>B: mutualLike = {id: ...}

    B->>M: INSERT matches (user1=B, user2=A, status='accepted')
    M-->>B: { id: matchId }

    B->>C: INSERT conversations (match_id, user1=B, user2=A)
    C-->>B: { id: conversationId }

    B->>N: INSERT notification (to=A, type='new_match')
    B->>N: INSERT notification (to=B, type='new_match')

    Note over A: Reçoit notif → MatchModal
    Note over B: MatchModal apparaît
```

---

## 6. Messagerie temps réel

```mermaid
sequenceDiagram
    actor S as Sender
    actor R as Receiver
    participant CS as ChatScreen (sender)
    participant CR as ChatScreen (receiver)
    participant DB as messages table
    participant CV as conversations table
    participant RT as Supabase Realtime
    participant N as notifications table

    S->>CS: Saisit + envoie message
    CS->>DB: INSERT message (conversation_id, sender_id, content)
    CS->>CV: UPDATE (last_message, last_message_at,\nuser2_unread_count + 1)

    DB->>RT: postgres_changes INSERT
    RT->>CR: Événement reçu

    alt Receiver dans le chat
        CR->>DB: Mark as read (is_read=true, read_at=now)
        CR->>CV: UPDATE user2_unread_count = 0
    else Receiver hors du chat
        RT->>N: INSERT notification (type='new_message')
        N-->>CR: NotificationToast 3s (si app ouverte)
        Note over CR: Badge rouge sur onglet Messages
    end

    Note over CS,CR: Images envoyées → upload Storage\npuis message_type = 'image', media_url = url
```

---

## 7. Système de notifications

```mermaid
flowchart TD
    subgraph Sources["Sources de notifications"]
        Like[Nouveau like reçu]
        Match[Nouveau match]
        Message[Nouveau message]
        View[Vue profil]
        System[Action communauté]
    end

    subgraph Insert["INSERT → notifications table"]
        Like -->|type: new_like| DB[(notifications)]
        Match -->|type: new_match| DB
        Message -->|type: new_message| DB
        View -->|type: profile_view| DB
        System -->|type: system| DB
    end

    subgraph Hook["useNotifications()"]
        DB -->|postgres_changes SUBSCRIBE| Hook_Load[Chargement initial\n50 dernières]
        DB -->|INSERT event| Hook_Realtime[Réception temps réel]
        Hook_Load --> State[État local\nnotifications]
        Hook_Realtime --> State
    end

    subgraph Display["Affichage"]
        State -->|unreadCount > 0| Badge[Badge BottomNavigation]
        State -->|new arrival| Toast[NotificationToast\n3 secondes ⏱️]
        State -->|clic bell| Panel[NotificationsPanel\nListe complète]
    end

    subgraph Actions["Actions"]
        Panel -->|clic notif| MarkRead[markAsRead]
        Panel -->|marquer tout| MarkAll[markAllAsRead]
        Panel -->|supprimer| Delete[deleteNotification]
        Toast -->|clic| Navigate[Naviguer vers l'écran]
    end

    subgraph Colors["Couleurs par type"]
        new_like --> Pink[🩷 Rose]
        new_match --> Rose[❤️ Rouge rose]
        new_message --> Blue[💙 Bleu]
        profile_view --> Slate[🔔 Gris]
        system --> Amber[🟡 Ambre — pas de toast]
    end
```

---

## 8. Premium & Paiement

```mermaid
sequenceDiagram
    actor U as Utilisateur
    participant PS as PremiumScreen
    participant PM as PaymentModal
    participant SV as paymentService
    participant EF as Edge Function
    participant PT as PayTech API
    participant DB as payments table
    participant PR as profiles table

    U->>PS: Voir les plans
    PS->>MetaPixel: trackViewContent()
    U->>PS: Sélectionner un plan

    PS->>PM: Ouvrir (plan)
    PM->>MetaPixel: trackInitiateCheckout()

    U->>PM: Choisir méthode (Orange Money / Wave / CB)
    U->>PM: Saisir numéro / infos CB
    PM->>SV: initiatePayment(plan, method, phone)

    SV->>EF: POST /pay
    EF->>PT: Initier transaction
    PT-->>EF: { transactionRef, paymentUrl }
    EF-->>SV: transactionRef
    SV-->>PM: Afficher "En attente..."

    loop Polling toutes 2s
        PM->>SV: getPaymentStatus(transactionRef)
        SV->>EF: GET /status?ref=...
        EF->>PT: Vérifier statut
        PT-->>EF: { status }
        EF-->>SV: { status, planTier }
        SV-->>PM: Statut actuel
    end

    PT->>EF: Webhook succès
    EF->>DB: INSERT payment (status='completed')
    EF->>PR: UPDATE is_premium=true, premium_tier, expires_at

    PM->>MetaPixel: trackPurchase()
    PM-->>U: Écran succès 🎉
```

---

## 9. Schéma de base de données

```mermaid
erDiagram
    profiles {
        uuid id PK
        text name
        text gender
        date date_of_birth
        text location
        text bio
        text profile_photo_url
        text[] photos
        text profession
        text education_level
        int height
        text prayer_frequency
        text relationship_goal
        text hijab_wear
        text polygamy_stance
        text[] interests
        bool is_premium
        text premium_tier
        bool profile_completed
        float latitude
        float longitude
        timestamp created_at
    }

    likes {
        uuid id PK
        uuid from_user_id FK
        uuid to_user_id FK
        text like_type
        timestamp created_at
    }

    matches {
        uuid id PK
        uuid user1_id FK
        uuid user2_id FK
        text status
        int compatibility_score
        timestamp matched_at
    }

    conversations {
        uuid id PK
        uuid match_id FK
        uuid user1_id FK
        uuid user2_id FK
        text last_message
        timestamp last_message_at
        int user1_unread_count
        int user2_unread_count
        timestamp created_at
    }

    messages {
        uuid id PK
        uuid conversation_id FK
        uuid sender_id FK
        uuid receiver_id FK
        text content
        text message_type
        text media_url
        bool is_read
        timestamp read_at
        timestamp created_at
    }

    notifications {
        uuid id PK
        uuid user_id FK
        text type
        text title
        text message
        jsonb data
        bool is_read
        timestamp read_at
        timestamp created_at
    }

    user_likes {
        uuid user_id PK
        int likes_remaining
        int super_likes_remaining
        int rewind_remaining
        text subscription_tier
        bool boost_active
        timestamp boost_expires_at
        int streak_days
        timestamp last_login
        timestamp last_reset
    }

    payments {
        uuid id PK
        uuid user_id FK
        text transaction_ref
        text plan_id
        text plan_tier
        int amount
        text method
        text status
        timestamp activated_at
        timestamp expires_at
    }

    community_posts {
        uuid id PK
        uuid user_id FK
        text content
        text image_url
        int likes_count
        int comments_count
        timestamp created_at
    }

    post_comments {
        uuid id PK
        uuid post_id FK
        uuid user_id FK
        uuid parent_comment_id FK
        text content
        timestamp created_at
    }

    community_events {
        uuid id PK
        uuid user_id FK
        text title
        text description
        date date
        text location
        int attendees_count
        timestamp created_at
    }

    reports {
        uuid id PK
        uuid reported_user_id FK
        uuid reporter_id FK
        text reason
        text status
        timestamp created_at
    }

    blocked_users {
        uuid user_id FK
        uuid blocked_user_id FK
        timestamp created_at
    }

    profiles ||--o{ likes : "envoie / reçoit"
    profiles ||--o{ matches : "user1 / user2"
    profiles ||--o{ conversations : "user1 / user2"
    profiles ||--o{ messages : "sender / receiver"
    profiles ||--o{ notifications : "reçoit"
    profiles ||--|| user_likes : "possède"
    profiles ||--o{ payments : "effectue"
    profiles ||--o{ community_posts : "publie"
    profiles ||--o{ post_comments : "commente"
    profiles ||--o{ community_events : "crée"
    profiles ||--o{ reports : "signale / est signalé"
    matches ||--|| conversations : "génère"
    conversations ||--o{ messages : "contient"
    community_posts ||--o{ post_comments : "reçoit"
    post_comments ||--o{ post_comments : "réponse imbriquée"
```

---

## 10. Composants — Arbre hiérarchique

```mermaid
graph TD
    App --> SplashScreen
    App --> AuthScreen
    App --> ResetPasswordScreen
    App --> ProfileCompletion
    App --> GenderModal
    App --> AppContent

    AppContent --> Header
    AppContent --> BottomNavigation
    AppContent --> DiscoveryScreen
    AppContent --> CommunityScreen
    AppContent --> MessagesScreen
    AppContent --> WhoLikedMeScreen
    AppContent --> ProfileScreen

    DiscoveryScreen --> ProfileCard
    DiscoveryScreen --> MatchModal
    DiscoveryScreen --> NoMoreLikesModal
    DiscoveryScreen --> SettingsScreen

    ProfileCard --> LikesCounter

    MessagesScreen --> ChatScreen
    ChatScreen --> UserProfileScreen

    ProfileScreen --> EditProfileModal
    ProfileScreen --> PremiumScreen
    ProfileScreen --> SettingsScreen

    PremiumScreen --> PaymentModal

    AppContent --> NotificationToast
    AppContent --> NotificationsPanel

    CommunityScreen --> CreateEventModal

    style App fill:#ff6b9d,color:#fff
    style AppContent fill:#ff6b9d,color:#fff
    style DiscoveryScreen fill:#f87171,color:#fff
    style MessagesScreen fill:#60a5fa,color:#fff
    style CommunityScreen fill:#34d399,color:#fff
    style ProfileScreen fill:#a78bfa,color:#fff
    style WhoLikedMeScreen fill:#fb923c,color:#fff
```

---

## 11. Hooks — Responsabilités

```mermaid
graph LR
    subgraph useNotifications["useNotifications(userId?)"]
        N1[Charger 50 notifs initiales]
        N2[Subscribe INSERT temps réel]
        N3[unreadCount calculé]
        N4[markAsRead / markAllAsRead]
        N5[deleteNotification]
        N6[refresh manuelle]
    end

    subgraph useLikes["useLikes(userId)"]
        L1[Charger user_likes]
        L2[Créer entrée si absente]
        L3[checkDailyReset — minuit]
        L4[checkLoginStreak — bonus]
        L5[consumeLike — toujours true\nbeta illimité]
        L6[consumeSuperLike]
        L7[activateBoost — 30min]
        L8[updateSubscriptionTier]
    end

    subgraph usePushNotifications["usePushNotifications(userId)"]
        P1[Register Service Worker]
        P2[Demande permission push]
        P3[Subscribe VAPID endpoint]
        P4[INSERT push_subscriptions]
    end

    subgraph useStatusBar["useStatusBar(isDarkMode)"]
        S1[Contrôle couleur status bar\nCapacitor native]
    end

    DiscoveryScreen -->|canLike, consumeLike| useLikes
    AppContent -->|unreadCount, notifications| useNotifications
    AppContent -->|register push| usePushNotifications
    AppContent -->|dark mode sync| useStatusBar
```

---

## 12. Plans Premium

```mermaid
graph LR
    subgraph Plans["💳 5 Plans disponibles"]
        Free["🆓 Gratuit\n15-25 likes/j\n0 super like\nVoir 5 likeurs"]
        Essentiel["Essentiel\n2 900 XOF / 30j\n30 likes/j\n3 super likes\nVoir 5 likeurs"]
        Elite["⭐ Élite\n4 900 XOF / 30j\n100 likes/j\n10 super likes\nVoir tous likeurs"]
        Prestige["👑 Prestige\n7 900 XOF / 30j\nLikes illimités\n15 super likes\nRewind illimité\nVoir tous likeurs"]
        PrestigeFemme["👸 Prestige Femme\n2 000 XOF / 30j\nLikes illimités\n15 super likes\nVoir tous likeurs"]
        VIPBadge["💎 VIP Badge\n9 900 XOF\nUne seule fois\nBadge permanent\nLikes illimités"]
    end

    subgraph Methods["💰 Méthodes de paiement"]
        OrangeMoney["🟠 Orange Money\n(Sénégal)"]
        Wave["🔵 Wave\n(Sénégal)"]
        Card["💳 Carte bancaire\n(Visa/Mastercard)"]
    end

    Plans --> Methods
```

---

## 13. PWA & Service Worker

```mermaid
flowchart TD
    subgraph SW["Service Worker (sw.js) — CACHE_NAME: amali-v5"]
        Install[Install\nCache: /, /index.html, /logoamali.png]
        Activate[Activate\nSupprimer anciens caches]
        Fetch{Requête entrante}
        SupabaseFetch[Supabase → Network first]
        StaticFetch[Assets → Cache first]
        Offline[Fallback offline → index.html]
    end

    subgraph Push["Push Notifications"]
        PushEvent[Événement push reçu]
        ShowNotif[showNotification\ntitle, body, icon, badge]
        Vibrate[Vibration 200-100-200ms]
        AppBadge[navigator.setAppBadge]
        Click[NotificationClick\n→ focus window\n→ postMessage NOTIFICATION_CLICK]
    end

    subgraph Registration["Enregistrement"]
        Hook[usePushNotifications]
        Register[navigator.serviceWorker.register]
        Permission[Notification.requestPermission]
        Subscribe[pushManager.subscribe VAPID]
        SaveDB[INSERT push_subscriptions]
    end

    Hook --> Register
    Register --> Permission
    Permission --> Subscribe
    Subscribe --> SaveDB

    Install --> Activate
    Fetch -->|api.supabase.co| SupabaseFetch
    Fetch -->|assets statiques| StaticFetch
    SupabaseFetch -->|offline| Offline
    StaticFetch -->|absent| Offline

    PushEvent --> ShowNotif
    ShowNotif --> Vibrate
    ShowNotif --> AppBadge
    ShowNotif --> Click
```

---

## 14. Admin Panel

```mermaid
graph TD
    AdminLogin["🔐 AdminLogin\nadmin@amali.love"] --> AdminApp

    subgraph AdminApp["AdminApp — Dashboard"]
        Overview["📊 Overview\nKPIs + graphiques"]
        Users["👥 Users\nListe + recherche + export CSV"]
        Matches["💕 Matches\nStats + taux de match"]
        Premium["💳 Premium\nAbonnements actifs + revenus"]
        Reports["🚨 Reports\nFile de modération"]
    end

    subgraph Overview_Detail["Métriques Overview"]
        TotalUsers[Total utilisateurs]
        GenderSplit[Répartition H/F]
        TotalMatches[Total matches]
        TotalMessages[Total messages]
        TotalConversations[Total conversations]
        IncompleteProfiles[Profils incomplets]
        ProfileQuality[Qualité profils\n% avec photo + bio]
    end

    subgraph Reports_Detail["Gestion Reports"]
        Pending[En attente]
        Resolved[Résolus]
        Rejected[Rejetés]
        Reason[Motif du signalement]
        UserInfo[Infos signalé + signaleur]
    end

    Overview --> Overview_Detail
    Reports --> Reports_Detail
```

---

## 15. Tracking Meta Pixel

```mermaid
flowchart LR
    subgraph Events["Événements trackés"]
        PageView["trackPageView()\nChaque changement d'écran"]
        Lead["trackLead()\nInscription"]
        CompleteReg["trackCompleteRegistration()\nProfil complété"]
        ViewContent["trackViewContent()\nVoir offres premium"]
        InitCheckout["trackInitiateCheckout()\nOuverture PaymentModal"]
        Purchase["trackPurchase()\nPaiement réussi"]
    end

    SplashScreen -->|mount| PageView
    AuthScreen -->|signUp| Lead
    ProfileCompletion -->|finish| CompleteReg
    PremiumScreen -->|open| ViewContent
    PaymentModal -->|open| InitCheckout
    PaymentModal -->|success| Purchase
```

---

## 16. Gestion des images

```mermaid
flowchart TD
    subgraph Upload["Upload images"]
        ProfilePhoto["Photo de profil\ncompress JPEG 85%\nmax 1920px"]
        ExtraPhotos["Photos supplémentaires\nidem compression"]
        ChatImage["Image dans chat\nupload direct"]
        CommunityImage["Image post communauté\nupload direct"]
    end

    subgraph Storage["Supabase Storage"]
        ProfileBucket["/profiles/{userId}/"]
        ChatBucket["/chat-images/{msgId}/"]
        CommunityBucket["/community-images/{postId}/"]
    end

    subgraph Fallback["Fallback si pas de photo"]
        AvatarM["Avatar SVG homme"]
        AvatarF["Avatar SVG femme"]
    end

    ProfilePhoto --> ProfileBucket
    ExtraPhotos --> ProfileBucket
    ChatImage --> ChatBucket
    CommunityImage --> CommunityBucket

    ProfileBucket -->|URL stockée dans profiles.profile_photo_url| DB
    ChatBucket -->|URL stockée dans messages.media_url| DB
    CommunityBucket -->|URL stockée dans community_posts.image_url| DB

    profiles.profile_photo_url -->|absent| Fallback
```

---

## 17. Sécurité & Modération

```mermaid
flowchart TD
    subgraph Validation["Validations côté client"]
        EmailCheck["Email valide\nBlocage: mailinator, guerrillamail..."]
        PwdCheck["Mot de passe ≥ 6 chars"]
        AgeCheck["Date naissance → âge ≥ 18 ans"]
        PhotoRequired["Photo obligatoire\npour apparaître en discovery"]
        GenderRequired["Genre obligatoire\npour filtrage"]
    end

    subgraph Moderation["Modération"]
        BlockUser["Bloquer utilisateur\n→ blocked_users table\n→ cache like/match/message"]
        ReportUser["Signaler utilisateur\n→ reports table\n(reason + status: pending)"]
        AdminReview["Admin Panel → ReportsPage\n→ Résoudre / Rejeter"]
    end

    subgraph Discovery_Security["Sécurité Discovery"]
        ExcludeBlocked["Exclure utilisateurs bloqués"]
        ExcludeLiked["Exclure déjà likés / matchés"]
        OppGenderOnly["Afficher genre opposé uniquement"]
        MinAgeFilter["Filtrer profils < 18 ans"]
    end

    Validation --> ProfileCompletion
    BlockUser --> Discovery_Security
    ReportUser --> AdminReview
    AdminReview -->|action| DB[(Supabase DB)]
```

---

## Résumé technique

| Dimension | Valeur |
|-----------|--------|
| Framework | React 18 + TypeScript + Vite |
| Style | Tailwind CSS |
| Backend | Supabase (Auth + PostgreSQL + Realtime + Storage) |
| Tables DB | 19 tables |
| Composants | 33 composants UI |
| Hooks | 4 hooks personnalisés |
| Plans premium | 5 (Free / Essentiel / Élite / Prestige / Prestige Femme) |
| Paiement | PayTech (Orange Money, Wave, CB) |
| Tracking | Meta Pixel (6 événements) |
| PWA | Service Worker v5 + Push VAPID |
| Admin | 5 pages (Overview, Users, Matches, Premium, Reports) |
| Temps réel | Supabase Realtime (messages, notifications) |
| Déploiement | PWA installable (iOS + Android + Desktop) |
