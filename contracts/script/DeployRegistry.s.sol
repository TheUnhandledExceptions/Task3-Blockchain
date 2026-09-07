// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/VerificationRegistry.sol";

contract DeployRegistry is Script {
    function run() external {
        // Read private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);

        // Deploy the registry
        VerificationRegistry registry = new VerificationRegistry();
        
        // Log the deployment address
        console.log("VerificationRegistry deployed at:", address(registry));

        // Stop broadcasting
        vm.stopBroadcast();
    }
}
