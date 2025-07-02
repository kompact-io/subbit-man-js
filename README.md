# SubbitMan

> Subbit.xyz manager for trustless pay as you go

## Intro

- See [Subbit.xyz](https://subbit.xyz) for an intro into what subbit is and how
  it works.
- See the [main repo](https://github.com/kompact-io/subbit-xyz) for the L1 and
  tx builders.
- The [blog posts](https://subbit.xyz/blog.html) introducing SubbitMan.

SubbitMan is a (almost) drop in replacement for
[AccMan](https://github.com/kompact-io/acc-man), but for **trustless** pay as
you go.

It is inteded to be run by providers, alongside their services to manage their
consumers' subbits.

Like AccMan it provides accounting functionality to be added to an existing
service with minimal changes to the server. AccMan has, intentionally, a very
basic interface. In order for Subbit.xyz to act as a drop in replacement, we
need to resolve a few points of subtle divergence.

## Setup and use

This repo uses flakes, however it should "just work" like any other node+pnpm
project.

`.env` variables may be provided.

To start the server

```sh
pnpm start
```

There are a helper functions available via the `justfile`. These are usable via
[just](https://github.com/casey/just).

## Design

See the design docs for commentary on the design.
