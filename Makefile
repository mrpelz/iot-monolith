BASE_FILE := $(shell npm ls --parseable --silent "@mrpelz/boilerplate-node" 2>/dev/null)

include $(BASE_FILE)/Makefile
