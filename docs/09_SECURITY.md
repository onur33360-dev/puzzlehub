# 09_SECURITY.md

# SlySwipe Security Guide

Version: 1.0

------------------------------------------------------------------------

# Goal

Protect users, application integrity and business assets.

Security is required before public release.

------------------------------------------------------------------------

# Security Philosophy

Security is not a feature.

Security is part of the product.

Every release must satisfy the rules below.

------------------------------------------------------------------------

# Production Build

Before every production release:

-   Debug mode disabled
-   Debug logging removed
-   Test endpoints removed
-   Test advertisements removed
-   Development flags disabled
-   In-app development tools (FPS overlay and similar) gated out of the
    release build

------------------------------------------------------------------------

# Secrets

Never store:

-   API Keys
-   Service Tokens
-   Private Keys
-   Signing Passwords

inside the repository.

Use secure environment management.

------------------------------------------------------------------------

# Network

Rules

-   HTTPS only
-   TLS required
-   No plain HTTP
-   Validate server responses

------------------------------------------------------------------------

# Authentication

If login exists:

-   Secure tokens
-   Token expiration
-   Logout support
-   Refresh token strategy

Never store passwords locally.

------------------------------------------------------------------------

# Google Play Integrity

Required before release.

Enable:

-   Play Integrity API
-   Basic Integrity
-   Device Integrity

Review regularly.

------------------------------------------------------------------------

# Permissions

Request only permissions actually required.

Avoid unnecessary permissions.

Users must understand why a permission is requested.

------------------------------------------------------------------------

# Privacy

Collect the minimum amount of user data.

Respect user privacy.

Never collect data without purpose.

------------------------------------------------------------------------

# Crash Handling

Use Crashlytics (or equivalent).

Never expose internal stack traces to users.

------------------------------------------------------------------------

# Obfuscation

Release builds should enable:

-   R8
-   ProGuard
-   Resource shrinking

when appropriate.

------------------------------------------------------------------------

# Dependency Management

Regularly update:

-   Android libraries
-   Gradle
-   SDK
-   Third-party services

Remove abandoned libraries.

------------------------------------------------------------------------

# Security Checklist

Before every release:

☐ Play Integrity enabled

☐ HTTPS verified

☐ Secrets removed

☐ Debug disabled

☐ Test ads removed

☐ Privacy Policy updated

☐ Data Safety verified

------------------------------------------------------------------------

# Golden Rule

A feature is not complete until it is secure.
