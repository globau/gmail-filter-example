.PHONY: format deploy pull auth test

# credentials expire after a week, so `make auth` is usually required
# before `make deploy`

# NODE_NO_WARNINGS hides node's deprecation warnings from npx so the tools' own output is readable

js-files:=$(filter-out lib-parse5322.js,$(wildcard *.js))

format:
	NODE_NO_WARNINGS=1 npx --yes @biomejs/biome@2.6.9 lint --config-path=.biome.json --write $(js-files)
	NODE_NO_WARNINGS=1 npx --yes @biomejs/biome@2.6.9 format --config-path=.biome.json --write $(js-files)

test:
	NODE_NO_WARNINGS=1 npx --yes @biomejs/biome@2.6.9 lint --config-path=.biome.json $(js-files)
	NODE_NO_WARNINGS=1 npx --yes @biomejs/biome@2.6.9 format --config-path=.biome.json $(js-files)

deploy: .clasp.json format
	NODE_NO_WARNINGS=1 npx --yes @google/clasp push

pull: .clasp.json
	NODE_NO_WARNINGS=1 npx --yes @google/clasp pull

.clasp.json:
	@echo "error: .clasp.json is missing; see README.md for setup" >&2
	@exit 1

auth:
	rm -f ~/.clasprc.json
	NODE_NO_WARNINGS=1 npx --yes @google/clasp login
