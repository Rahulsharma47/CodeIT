plugins {
    id("com.android.application")
    id("kotlin-android")
    id("dev.flutter.flutter-gradle-plugin")
    id("com.google.gms.google-services")  // ADD THIS LINE
}

android {
    namespace = "com.example.code_debugger_mobile"
    compileSdk = 34  // UPDATE THIS

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_11.toString()
    }

    defaultConfig {
        applicationId = "com.example.code_debugger_mobile"
        minSdk = 21  // UPDATE THIS (Firebase needs minimum 21)
        targetSdk = 34  // UPDATE THIS
        versionCode = 1
        versionName = "1.0.0"
        multiDexEnabled = true  // ADD THIS for Firebase
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

flutter {
    source = "../.."
}

dependencies {
    // ADD THESE FOR FIREBASE
    implementation(platform("com.google.firebase:firebase-bom:32.7.0"))
    implementation("com.google.firebase:firebase-analytics")
    implementation("com.google.firebase:firebase-auth")
    implementation("com.google.firebase:firebase-firestore")
}