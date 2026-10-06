# Proposed candidate and release checklist

This maintenance/versioning checklist is a proposal for owner review, not an adopted public support guarantee. The package remains private at 0.0.0-private. No public release version or registry publication is authorized by this checklist.

1. Record the candidate commit and run the repository qualification plus independent packed consumer checks. Inspect the archive allowlist, documented exports, license texts, font hashes and absence of consumer identity, secrets or private paths. The archive includes its consumer README.
2. Identify the archive by commit and SHA-256. Never replace an accepted archive with changed bytes under the same identity. Record old and new archive identities in each consumer upgrade receipt.
3. Install the candidate into an independent neutral consumer. Compile TypeScript/Astro, compare output and exercise the gallery/lightbox browser contracts. Run affected real-consumer contracts separately; neutral proof does not imply production acceptance.
4. Preserve the previous archive and lockfile. Demonstrate rollback by restoring that exact dependency pin and lockfile, installing frozen dependencies and repeating affected consumer checks. Production deployment rollback remains a separate consumer operation.
5. Before public release, agree a version and supported toolchain, remove private only with explicit release authorization, and review packed README/API agreement. Breaking exports, props, behavior or peer requirements need conspicuous breaking notes; supported additions and compatible fixes need distinct versions. No automatic publication workflow exists.

Current package exports document, metadata, navigation, fonts.css and portfolio. Feed helpers, content adapters, a complete starter, theme configuration and universal diagnostics are future proposals, not public API. Astro peer-range coverage beyond the qualified exact toolchain is declared rather than exhaustively tested. One gallery per page is supported.
