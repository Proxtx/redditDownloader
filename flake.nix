{
  description = "Reddit Downloader";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    let
      pname = "redditDownloader";
      version = "0.1.0";
      configPath = "/etc/${pname}/config.json";
    in
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        nodejs = pkgs.nodejs_20;

        appPackage = pkgs.buildNpmPackage {
          inherit pname version;
          src = ./.;
          npmDepsHash = "sha256-ljMMnWNurBgvFsEUCVxgW/5Lp9dsrMEvYi6VKImGlag=";
          nodejs = nodejs;

          dontNpmBuild = true;

          installPhase = ''
            mkdir -p $out
            cp -r * $out/
          '';
        };
      in
      {
        packages.default = appPackage;

        devShells.default = pkgs.mkShell {
          buildInputs = [ nodejs pkgs.nodePackages.npm ];
        };
      }
    ) // {
      nixosModules.default = { config, lib, pkgs, ... }:
        with lib;
        let
          appPackage = self.packages.${pkgs.system}.default;

          cfg = config.services.${pname};
        in {
          options.services.${pname} = {
            enable = mkEnableOption "Enable ${pname} service";

            config = mkOption {
              type = types.attrs;
              description = "Configuration written to ${configPath}";
              default = {};
            };
          };

          config = mkIf cfg.enable {
            environment.etc."${pname}/config.json".text =
              builtins.toJSON cfg.config;

            systemd.services.${pname} = {
              description = "${pname} node service";
              wantedBy = [ "multi-user.target" ];
              after = [ "network.target" ];

              serviceConfig = {
                ExecStart = "${pkgs.nodejs_20}/bin/node ${appPackage}/main.js";
                Restart = "always";
                WorkingDirectory = appPackage;
                Environment = "NODE_ENV=production CONFIG_PATH=${configPath}";
              };
            };
          };
        };
    };
}
