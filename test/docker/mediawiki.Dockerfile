FROM mediawiki:1.43

# Install Lua 5.1 for Scribunto's luastandalone engine.
RUN apt-get update \
    && apt-get install -y --no-install-recommends lua5.1 \
    && rm -rf /var/lib/apt/lists/*
