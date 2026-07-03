BASE_FILE := $(shell npm ls --parseable --silent "@mrpelz/boilerplate-node" 2>/dev/null)

export PERSISTENCE_PATH = ./tmp.json

include $(BASE_FILE)/Makefile

PACKAGE_LOCK_LINT_ARGS := $(PACKAGE_LOCK_LINT_ARGS) git.i.wurstsalat.cloud

check_package_lock:
	lockfile-lint --path npm-shrinkwrap.json --type npm $(PACKAGE_LOCK_LINT_ARGS)
