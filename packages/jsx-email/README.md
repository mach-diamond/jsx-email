[npm]: https://img.shields.io/npm/v/jsx-email
[npm-url]: https://www.npmjs.com/package/jsx-email

[![npm][npm]][npm-url]
[![Join our Discord](https://img.shields.io/badge/join_our-Discord-5a64ea)](https://discord.gg/FywZN57mTg)
[![libera manifesto](https://img.shields.io/badge/libera-manifesto-lightgrey.svg)](https://liberamanifesto.com)

<div align="center">
	<img src="https://raw.githubusercontent.com/shellscape/jsx-email/main/assets/npm-header.svg" alt="JSX email"/><br/><br/>
</div>

# JSX&thinsp;email

Build and send emails using React and TypeScript.

JSX email provides a set of React components and helpers for building delightful, responsive email templates that work across modern email clients. The components handle compatibility and client inconsistencies so designers and developers can focus on building impactful templates instead of fighting email rendering quirks.

## Version 3.0.0

Version 3 modernizes the runtime, package exports, preview app, scaffold, plugins, and CLI. It requires Node.js `22.0.0` or newer and React `19.1.0` or newer. Please read the [v3 Migration Guide](https://jsx.email/docs/v3/migration) before upgrading existing projects.

To browse the source code and documentation markdown for v2.8.4, use the [jsx-email-v2.8.4 tag](https://github.com/shellscape/jsx-email/tree/jsx-email-v2.8.4).

## Getting Started

Everything to know about components, props, and usage is available in the [Documentation](https://jsx.email/docs/introduction).

For new projects, use `create-mail`:

```sh
npx create-mail my-email-project
```

## Requirements

The packages and components that make up JSX email require an [LTS](https://github.com/nodejs/Release) Node version, v22.0.0 or newer, and React v19.1.0 or newer.

## Components

A list of available components can be found in the [JSX email documentation](https://jsx.email/docs/introduction).

## Featured Features

The goals of this project are to provide an improved focus on Developer Experience, maintenance, fast improvements, and fast releases. JSX email includes:

- [Email Client Compatibility Checking](https://jsx.email/docs/core/cli#client-compatibility-check)
- Exclusive Components
- Handles cross-client inconsistencies for you
- Optional Configuration Files
- Plugins
- Crazy fast Tailwind support
- Support for `<Suspense>` and `async` within Components
- Enhanced Developer Experience (DX)
- Wonderful Command Line tools
- Works with Monorepos out of the box. No exhaustive setup needed.
- A smooth and simple Preview Server
- Fast improvements, feature development, and releases
- Community-driven, not Company-driven
- No vendor lock-in for tools. `jsx-email` uses only generic components and tools

## Service Integrations

Email built and rendered with JSX email can be used with any email provider that provides an API for sending email as a string. This includes [AWS SES](https://aws.amazon.com/ses), [Loops](https://loops.so), [Nodemailer](https://nodemailer.com), [Postmark](https://postmarkapp.com), [Resend](https://resend.com), [Plunk](https://www.useplunk.com/), and [SendGrid](https://sendgrid.com). See [Email Providers](https://jsx.email/docs/email-providers) for more info and example usage.

## Contributing, Working With This Repo

We welcome contributions. This is a community-driven project with no corporate sponsorship or backing. The maintainers and users keep this project going.

Please check out our [Contribution Guide](./CONTRIBUTING.md).

We, the maintainers, use JSX email daily.

## License

[MIT License](./LICENSE.md)

## Multi-project Email Studio (fork)

Run `just dev` in this checkout to open the unified studio on port 55420.
The registry in `studio.projects.json` locates project-owned
`email-studio.config.ts` files; paths are relative to the registry. Add or
remove entries there to change the shared library. Missing checkouts appear
as unavailable projects without preventing other projects from opening.
Project Management uses `scripts/dev-panels.sh` to launch this same studio.

A project launcher passes `--project /path/to/email-studio.config.ts`, which
loads **only that project**, regardless of the shared registry. The CLI also
auto-discovers an enclosing project config when run as `email studio` from
a project directory. Explicit project scope never falls back to all projects.

```sh
just dev --port 55420 --no-open
node packages/jsx-email/cli.js studio --project /path/to/email-studio.config.ts
node packages/jsx-email/cli.js studio --registry /path/to/projects.json
```

Each project config exports `id`, `name`, `templateDir`, and `brands`. Brands
have stable `id`, `name`, optional `description`, `color`, and `templates`
glob patterns. Paths are relative to the config file. Optional `assetDir`
provides `/static/` assets, namespaced per project. Optional `render` uses
the project's production renderer; `withBrand(id, render)` wraps the whole
async render with project-owned context. `previewProps(templatePath, brandId)`
provides brand-aware sample data; template `previewPresets` remain available.
Both named `Template` and default component exports are supported.

One Vite server serves the library and previews. Templates render when a
brand opens, and only templates matching that brand's applicability are
returned. Project changes invalidate the cache; failed saves preserve the
last successful preview and expose retry. Build caches are isolated per
session and removed on shutdown. This local development tool executes trusted
project configuration and template code; it does not send email.

Project launchers can use `EMAIL_STUDIO_ROOT` to select another checkout.
Without a shared checkout they bootstrap the fork into their own ignored
`node_modules/.cache` directory, so a standalone project clone needs no other
venture repositories. Project dependencies must be installed normally.
